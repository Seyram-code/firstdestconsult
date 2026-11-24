require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
  closeDatabase,
  deleteRecord,
  findRecord,
  initializeDatabase,
  insertRecord,
  listRecords,
  pingDatabase,
  updateRecord,
} = require('./dataStore');
const {
  getAdminAccessCode,
  resetAdminAccessCode,
} = require('./adminConfig');
const { createAdminNotifier, createApplicantNotifier } = require('./adminNotifications');
const { normalizeOfferPrograms } = require('./programCatalog');

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@firstdestltd.com';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+233243499242';
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'offers');
const APPLICATION_UPLOADS_DIR = path.join(__dirname, '.private-uploads', 'applications');
const ADMIN_SESSION_COOKIE = 'fdt_admin_session';
const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const CACHEABLE_PUBLIC_ASSET_EXTENSIONS = new Set([
  '.css',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.png',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
]);

function setPublicAssetCacheHeaders(res, filePath) {
  if (CACHEABLE_PUBLIC_ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_.-]/g, '');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeName}`);
  },
});
const upload = multer({ storage });
const applicationUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(APPLICATION_UPLOADS_DIR, { recursive: true });
      cb(null, APPLICATION_UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8, fields: 6, fieldSize: 16 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = new Map([
      ['.pdf', ['application/pdf']],
      ['.doc', ['application/msword', 'application/octet-stream']],
      ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
      ['.jpg', ['image/jpeg']],
      ['.jpeg', ['image/jpeg']],
      ['.png', ['image/png']],
    ]);
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypes = allowedTypes.get(extension);
    if (!mimeTypes || !mimeTypes.includes(file.mimetype)) {
      cb(new Error('Upload PDF, Word, JPG, or PNG documents only.'));
      return;
    }
    cb(null, true);
  },
});

app.use(cors());
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads/offers', express.static(UPLOADS_DIR, { setHeaders: setPublicAssetCacheHeaders }));
app.use(express.static(__dirname, { setHeaders: setPublicAssetCacheHeaders }));

function createAdminSessionToken() {
  const issuedAt = Date.now().toString();
  const signature = crypto.createHmac('sha256', getAdminAccessCode()).update(issuedAt).digest('hex');
  return `${issuedAt}.${signature}`;
}

function hasValidAdminSession(req) {
  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!cookie) return false;

  const token = decodeURIComponent(cookie.slice(ADMIN_SESSION_COOKIE.length + 1));
  const [issuedAt, signature] = token.split('.');
  const timestamp = Number(issuedAt);
  if (!Number.isSafeInteger(timestamp) || Date.now() - timestamp > ADMIN_SESSION_MAX_AGE || timestamp > Date.now() || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', getAdminAccessCode()).update(issuedAt).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function requireAdminSession(req, res, next) {
  if (!hasValidAdminSession(req)) {
    res.status(401).json({ success: false, message: 'Admin login required.' });
    return;
  }
  next();
}

function setAdminSessionCookie(req, res, token, maxAge = ADMIN_SESSION_MAX_AGE) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAge / 1000)}${secure}`);
}

function handleOpportunityDocumentUpload(req, res, next) {
  const fields = [
    ...Array.from({ length: 8 }, (_value, index) => ({ name: `document_${index}`, maxCount: 1 })),
    { name: 'supportingDocuments', maxCount: 8 },
  ];
  applicationUpload.fields(fields)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const status = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE'].includes(error.code) ? 413 : 400;
    res.status(status).json({ success: false, message: error.message });
  });
}

function removeUploadedDocuments(files) {
  files.forEach((file) => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  });
}

const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : true;
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || SMTP_USER || ADMIN_EMAIL;

const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

const notifyAdmin = createAdminNotifier({
  transporter: transporter && {
    sendMail: (message) => transporter.sendMail({ from: SMTP_FROM, ...message }),
  },
  adminEmail: ADMIN_EMAIL,
  adminPhone: ADMIN_PHONE,
  frogUsername: process.env.FROG_SMS_USERNAME,
  frogApiKey: process.env.FROG_SMS_API_KEY,
  frogSenderId: process.env.FROG_SMS_SENDER_ID,
});

const notifyApplicant = createApplicantNotifier({
  transporter: transporter && {
    sendMail: (message) => transporter.sendMail({ from: SMTP_FROM, ...message }),
  },
  from: SMTP_FROM,
});

app.get('/api/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ ok: false, database: 'disconnected' });
  }
});

app.delete('/api/admin/offer-applications/:id', requireAdminSession, async (req, res) => {
  try {
    const application = await findRecord('offerApplications', req.params.id);
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found.' });
      return;
    }

    for (const document of application.documents || []) {
      if (document.storageName && path.basename(document.storageName) === document.storageName) {
        removeUploadedDocuments([{ path: path.join(APPLICATION_UPLOADS_DIR, document.storageName) }]);
      }
    }
    await deleteRecord('offerApplications', req.params.id);
    res.json({ success: true, message: 'Opportunity application deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting opportunity application' });
  }
});

app.post('/api/application', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = payload.name || [payload.firstName, payload.lastName].filter(Boolean).join(' ');
    const record = {
      ...payload,
      name,
      phone: payload.phone || payload.telephone || '',
    };
    await insertRecord('applications', {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...record,
    });

    const notifications = await notifyAdmin(
      record.type ? `New ${record.type}` : 'New Travel Application',
      record,
    );
    const applicantConfirmation = await notifyApplicant(
      record.email,
      record.type || 'travel application',
      record.name,
      record,
    );

    res.status(200).json({ success: true, message: 'Application received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting application' });
  }
});

app.post('/api/document-help', async (req, res) => {
  try {
    const payload = req.body || {};
    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      email: payload.email || '',
      currentCountry: payload.currentCountry || '',
      destinationCountry: payload.destinationCountry || '',
      documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [payload.documentTypes].filter(Boolean),
    };
    await insertRecord('documentHelpRequests', record);

    const notifications = await notifyAdmin('New Document Help Request', record);
    const applicantConfirmation = await notifyApplicant(record.email, 'document request', record.name, record);

    res.status(200).json({ success: true, message: 'Document help request received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting document request' });
  }
});

app.post('/api/study-abroad', async (req, res) => {
  try {
    const payload = req.body || {};
    const selectedCountries = Array.isArray(payload.countryChoice)
      ? payload.countryChoice
      : String(payload.countryChoice || '').split(',').map((item) => item.trim()).filter(Boolean);

    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      email: payload.email || '',
      qualification: payload.qualification || '',
      program: payload.program || '',
      degreeType: payload.degreeType || '',
      countryChoice: selectedCountries,
      programType: payload.programType || '',
    };
    await insertRecord('studyAbroadRequests', record);

    const notifications = await notifyAdmin('New Study Abroad Request', record);
    const applicantConfirmation = await notifyApplicant(record.email, 'study abroad request', record.name, record);

    res.status(200).json({ success: true, message: 'Study abroad request received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting study abroad request' });
  }
});

app.post('/api/work-abroad', async (req, res) => {
  try {
    const payload = req.body || {};
    const selectedCountries = Array.isArray(payload.countryChoice)
      ? payload.countryChoice
      : String(payload.countryChoice || '').split(',').map((item) => item.trim()).filter(Boolean);

    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      email: payload.email || '',
      qualification: payload.qualification || '',
      countryChoice: selectedCountries,
    };
    await insertRecord('workAbroadRequests', record);

    const notifications = await notifyAdmin('New Work Abroad Request', record);
    const applicantConfirmation = await notifyApplicant(record.email, 'work abroad request', record.name, record);

    res.status(200).json({ success: true, message: 'Work abroad request received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting work abroad request' });
  }
});

app.post('/api/flight-booking', async (req, res) => {
  try {
    const payload = req.body || {};

    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      currentCountry: payload.currentCountry || '',
      currentAirport: payload.currentAirport || '',
      destinationCountry: payload.destinationCountry || '',
      destinationAirport: payload.destinationAirport || '',
      destinationCity: payload.destinationCity || '',
      departureDate: payload.departureDate || '',
      returnDate: payload.returnDate || '',
      airline: payload.airline || 'No preference',
      email: payload.email || '',
    };
    await insertRecord('flightBookings', record);

    const notifications = await notifyAdmin('New Flight Booking Request', record);
    const applicantConfirmation = await notifyApplicant(record.email, 'flight booking request', record.name, record);

    res.status(200).json({ success: true, message: 'Flight booking request received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting flight booking request' });
  }
});

app.post('/api/hotel-booking', async (req, res) => {
  try {
    const payload = req.body || {};

    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      destinationCountry: payload.destinationCountry || '',
      destinationCity: payload.destinationCity || '',
      checkInDate: payload.checkInDate || '',
      checkOutDate: payload.checkOutDate || '',
      adults: payload.adults || '',
      kids: payload.kids || '',
      email: payload.email || '',
    };
    await insertRecord('hotelBookings', record);

    const notifications = await notifyAdmin('New Hotel Booking Request', record);
    const applicantConfirmation = await notifyApplicant(record.email, 'hotel reservation request', record.name, record);

    res.status(200).json({ success: true, message: 'Hotel reservation request received', notifications, applicantConfirmation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting hotel reservation request' });
  }
});

app.post('/api/offers', upload.single('image'), async (req, res) => {
  try {
    const payload = req.body || {};
    const file = req.file;
    const imagePath = file ? `/uploads/offers/${file.filename}` : payload.image || '';
    let requiredDocuments = [];

    if (payload.requiredDocuments) {
      try {
        requiredDocuments = JSON.parse(payload.requiredDocuments);
      } catch {
        res.status(400).json({ success: false, message: 'Required documents must be a valid list.' });
        return;
      }
    }

    if (!Array.isArray(requiredDocuments) || requiredDocuments.length > 8 ||
        requiredDocuments.some((document) => typeof document !== 'string' || !document.trim())) {
      res.status(400).json({ success: false, message: 'Add up to 8 valid required document names.' });
      return;
    }
    const { programs, error: programsError } = normalizeOfferPrograms(payload.type || '', payload.studyPrograms);
    if (programsError) {
      res.status(400).json({ success: false, message: programsError });
      return;
    }

    await insertRecord('offers', {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      title: payload.title || '',
      company: payload.company || '',
      location: payload.location || '',
      type: payload.type || '',
      description: payload.description || '',
      studyPrograms: programs,
      requiredDocuments: requiredDocuments.map((document) => document.trim()),
      link: payload.link || '',
      image: imagePath,
    });

    res.status(200).json({ success: true, message: 'Offer published', image: imagePath, requiredDocuments, studyPrograms: programs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error publishing offer' });
  }
});

app.put('/api/offers/:id', upload.single('image'), async (req, res) => {
  try {
    const existingOffer = await findRecord('offers', req.params.id);
    if (!existingOffer) {
      res.status(404).json({ success: false, message: 'Offer not found.' });
      return;
    }

    const payload = req.body || {};
    let requiredDocuments = [];
    if (payload.requiredDocuments) {
      try {
        requiredDocuments = JSON.parse(payload.requiredDocuments);
      } catch {
        res.status(400).json({ success: false, message: 'Required documents must be a valid list.' });
        return;
      }
    }

    if (!Array.isArray(requiredDocuments) || requiredDocuments.length > 8 ||
        requiredDocuments.some((document) => typeof document !== 'string' || !document.trim())) {
      res.status(400).json({ success: false, message: 'Add up to 8 valid required document names.' });
      return;
    }

    const type = payload.type || existingOffer.type || '';
    const submittedPrograms = payload.studyPrograms !== undefined
      ? payload.studyPrograms
      : type === existingOffer.type
        ? existingOffer.studyPrograms || []
        : [];
    const { programs, error: programsError } = normalizeOfferPrograms(type, submittedPrograms);
    if (programsError) {
      res.status(400).json({ success: false, message: programsError });
      return;
    }

    const file = req.file;
    const imagePath = file ? `/uploads/offers/${file.filename}` : existingOffer.image || '';
    const updatedOffer = {
      ...existingOffer,
      id: existingOffer.id,
      title: payload.title || existingOffer.title || '',
      location: payload.location || existingOffer.location || '',
      type,
      description: payload.description || existingOffer.description || '',
      studyPrograms: programs,
      requiredDocuments: requiredDocuments.map((document) => document.trim()),
      image: imagePath,
    };

    await updateRecord('offers', updatedOffer);
    res.status(200).json({
      success: true,
      message: 'Offer updated',
      image: imagePath,
      requiredDocuments: updatedOffer.requiredDocuments,
      studyPrograms: updatedOffer.studyPrograms,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error updating offer' });
  }
});

app.post('/api/offers/:id/applications', handleOpportunityDocumentUpload, async (req, res) => {
  const uploadedFiles = Object.values(req.files || {}).flat();
  try {
    const offer = await findRecord('offers', req.params.id);
    if (!offer) {
      removeUploadedDocuments(uploadedFiles);
      res.status(404).json({ success: false, message: 'This opportunity is no longer available.' });
      return;
    }

    const requiredDocuments = Array.isArray(offer.requiredDocuments) ? offer.requiredDocuments : [];
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const email = String(req.body.email || '').trim();
    const message = String(req.body.message || '').trim();
    const selectedProgramName = String(req.body.studyProgram || '').trim();
    const availablePrograms = Array.isArray(offer.studyPrograms) ? offer.studyPrograms : [];
    const studyProgram = availablePrograms.find((program) => program.name === selectedProgramName) || null;
    const requiresProgramSelection = offer.type === 'Study Visa' && availablePrograms.length > 0;
    const invalidProgram = requiresProgramSelection ? !studyProgram : Boolean(selectedProgramName);
    const missingDocuments = requiredDocuments.filter((_document, index) => !req.files?.[`document_${index}`]?.length);
    const unexpectedDocuments = Object.keys(req.files || {}).some((field) =>
      field.startsWith('document_') && Number(field.slice('document_'.length)) >= requiredDocuments.length
    );

    if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || missingDocuments.length || unexpectedDocuments || invalidProgram) {
      removeUploadedDocuments(uploadedFiles);
      res.status(400).json({
        success: false,
        message: missingDocuments.length
          ? `Please upload all required documents: ${missingDocuments.join(', ')}.`
          : unexpectedDocuments
            ? 'Please upload only the documents requested for this opportunity.'
            : invalidProgram
              ? requiresProgramSelection
                ? 'Please choose one of the programs listed for this study offer.'
                : 'A program selection is not available for this opportunity.'
              : 'Enter your name, phone number, and a valid email address.',
      });
      return;
    }

    const documents = requiredDocuments.map((label, index) => {
      const file = req.files?.[`document_${index}`]?.[0];
      return {
        label,
        originalName: path.basename(file.originalname),
        storageName: file.filename,
        contentType: file.mimetype,
        size: file.size,
      };
    });
    (req.files?.supportingDocuments || []).forEach((file) => {
      documents.push({
        label: 'Additional supporting document',
        originalName: path.basename(file.originalname),
        storageName: file.filename,
        contentType: file.mimetype,
        size: file.size,
      });
    });
    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      offerId: String(offer.id),
      offerTitle: offer.title,
      name,
      phone,
      email,
      message,
      studyProgram,
      documents,
    };

    await insertRecord('offerApplications', record);
    const notifications = await notifyAdmin('New Opportunity Application', {
      ...record,
      studyProgram: studyProgram
        ? `${studyProgram.name} — ${studyProgram.category} (${studyProgram.duration})`
        : 'Not selected',
      documents: documents.map((document) => `${document.label}: ${document.originalName}`),
    });
    const applicantConfirmation = await notifyApplicant(
      email,
      `application for ${offer.title}`,
      name,
      {
        Opportunity: offer.title,
        Phone: phone,
        Email: email,
        ...(studyProgram ? { Program: `${studyProgram.name} — ${studyProgram.category} (${studyProgram.duration})` } : {}),
        Message: message || 'No message',
        Documents: documents.map((document) => `${document.label}: ${document.originalName}`),
      },
    );

    res.status(200).json({ success: true, message: 'Your application has been submitted.', notifications, applicantConfirmation });
  } catch (error) {
    removeUploadedDocuments(uploadedFiles);
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting opportunity application' });
  }
});

app.get('/api/admin/offer-applications', requireAdminSession, async (_req, res) => {
  try {
    res.json({ applications: await listRecords('offerApplications') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving opportunity applications' });
  }
});

app.get('/api/admin/offer-applications/:applicationId/documents/:documentIndex', requireAdminSession, async (req, res) => {
  try {
    const application = await findRecord('offerApplications', req.params.applicationId);
    const document = application?.documents?.[Number(req.params.documentIndex)];
    if (!document || !document.storageName || path.basename(document.storageName) !== document.storageName) {
      res.status(404).json({ success: false, message: 'Document not found.' });
      return;
    }

    res.download(
      path.join(APPLICATION_UPLOADS_DIR, document.storageName),
      document.originalName,
      (error) => {
        if (error && !res.headersSent) {
          res.status(error.code === 'ENOENT' ? 404 : 500).json({ success: false, message: 'Unable to download document.' });
        }
      },
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving document' });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    res.json({ applications: await listRecords('applications') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving applications' });
  }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    await deleteRecord('applications', req.params.id);
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting application' });
  }
});

app.get('/api/document-help', async (req, res) => {
  try {
    res.json({ requests: await listRecords('documentHelpRequests') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving document requests' });
  }
});

app.delete('/api/document-help/:id', async (req, res) => {
  try {
    await deleteRecord('documentHelpRequests', req.params.id);
    res.json({ success: true, message: 'Document help request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting document request' });
  }
});

app.get('/api/study-abroad', async (req, res) => {
  try {
    res.json({ requests: await listRecords('studyAbroadRequests') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving study requests' });
  }
});

app.delete('/api/study-abroad/:id', async (req, res) => {
  try {
    await deleteRecord('studyAbroadRequests', req.params.id);
    res.json({ success: true, message: 'Study abroad request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting study abroad request' });
  }
});

app.get('/api/work-abroad', async (req, res) => {
  try {
    res.json({ requests: await listRecords('workAbroadRequests') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving work requests' });
  }
});

app.delete('/api/work-abroad/:id', async (req, res) => {
  try {
    await deleteRecord('workAbroadRequests', req.params.id);
    res.json({ success: true, message: 'Work abroad request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting work abroad request' });
  }
});

app.get('/api/flight-booking', async (req, res) => {
  try {
    res.json({ requests: await listRecords('flightBookings') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving flight bookings' });
  }
});

app.delete('/api/flight-booking/:id', async (req, res) => {
  try {
    await deleteRecord('flightBookings', req.params.id);
    res.json({ success: true, message: 'Flight booking request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting flight booking request' });
  }
});

app.get('/api/hotel-booking', async (req, res) => {
  try {
    res.json({ requests: await listRecords('hotelBookings') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving hotel bookings' });
  }
});

app.delete('/api/hotel-booking/:id', async (req, res) => {
  try {
    await deleteRecord('hotelBookings', req.params.id);
    res.json({ success: true, message: 'Hotel reservation request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting hotel reservation request' });
  }
});

app.get('/api/offers', async (req, res) => {
  try {
    res.json({ offers: await listRecords('offers') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error retrieving offers' });
  }
});

app.delete('/api/offers/:id', async (req, res) => {
  try {
    const offer = await findRecord('offers', req.params.id);
    if (offer && offer.image) {
      const imagePath = path.join(__dirname, offer.image.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    const applications = await listRecords('offerApplications');
    for (const application of applications.filter((item) => String(item.offerId) === String(req.params.id))) {
      for (const document of application.documents || []) {
        if (document.storageName && path.basename(document.storageName) === document.storageName) {
          removeUploadedDocuments([{ path: path.join(APPLICATION_UPLOADS_DIR, document.storageName) }]);
        }
      }
      await deleteRecord('offerApplications', application.id);
    }
    await deleteRecord('offers', req.params.id);
    res.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting offer' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { code } = req.body || {};
  const accessCode = getAdminAccessCode();
  if (!accessCode) {
    res.status(503).json({ success: false, message: 'Admin access code is not configured.' });
    return;
  }

  if (String(code || '').trim() === accessCode) {
    setAdminSessionCookie(req, res, createAdminSessionToken());
    res.json({ success: true, message: 'Access granted' });
    return;
  }

  res.status(401).json({ success: false, message: 'Incorrect access code' });
});

app.post('/api/admin/logout', (req, res) => {
  setAdminSessionCookie(req, res, '', 0);
  res.json({ success: true, message: 'Logged out' });
});

app.post('/api/admin/reset-code', (req, res) => {
  try {
    const { currentCode, newCode } = req.body || {};
    const result = resetAdminAccessCode(currentCode, newCode);

    res.json({ success: true, message: 'Admin access code updated successfully.', code: result.code });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Unable to reset admin access code.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error(`Unable to start server: ${error.message}`);
  await closeDatabase();
  process.exitCode = 1;
});
