require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  closeDatabase,
  deleteRecord,
  findRecord,
  initializeDatabase,
  insertRecord,
  listRecords,
  pingDatabase,
} = require('./dataStore');
const {
  getAdminAccessCode,
  resetAdminAccessCode,
} = require('./adminConfig');
const { createAdminNotifier } = require('./adminNotifications');

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@firstdestltd.com';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+233243499242';
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'offers');

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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

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

app.get('/api/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(503).json({ ok: false, database: 'disconnected' });
  }
});

app.post('/api/application', async (req, res) => {
  try {
    const payload = req.body;
    await insertRecord('applications', {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    });

    const notifications = await notifyAdmin(
      payload.type ? `New ${payload.type}` : 'New Travel Application',
      payload,
    );

    res.status(200).json({ success: true, message: 'Application received', notifications });
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

    res.status(200).json({ success: true, message: 'Document help request received', notifications });
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

    res.status(200).json({ success: true, message: 'Study abroad request received', notifications });
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

    res.status(200).json({ success: true, message: 'Work abroad request received', notifications });
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
      currentCountry: payload.currentCountry || '',
      currentAirport: payload.currentAirport || '',
      destinationCountry: payload.destinationCountry || '',
      destinationAirport: payload.destinationAirport || '',
      destinationCity: payload.destinationCity || '',
      departureDate: payload.departureDate || '',
      returnDate: payload.returnDate || '',
      airline: payload.airline || 'No preference',
    };
    await insertRecord('flightBookings', record);

    const notifications = await notifyAdmin('New Flight Booking Request', record);

    res.status(200).json({ success: true, message: 'Flight booking request received', notifications });
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
      destinationCountry: payload.destinationCountry || '',
      destinationCity: payload.destinationCity || '',
      checkInDate: payload.checkInDate || '',
      checkOutDate: payload.checkOutDate || '',
      adults: payload.adults || '',
      kids: payload.kids || '',
    };
    await insertRecord('hotelBookings', record);

    const notifications = await notifyAdmin('New Hotel Booking Request', record);

    res.status(200).json({ success: true, message: 'Hotel reservation request received', notifications });
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

    await insertRecord('offers', {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      title: payload.title || '',
      company: payload.company || '',
      location: payload.location || '',
      type: payload.type || '',
      description: payload.description || '',
      link: payload.link || '',
      image: imagePath,
    });

    res.status(200).json({ success: true, message: 'Offer published', image: imagePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error publishing offer' });
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
    res.json({ success: true, message: 'Access granted' });
    return;
  }

  res.status(401).json({ success: false, message: 'Incorrect access code' });
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
