require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getAdminAccessCode,
  resetAdminAccessCode,
} = require('./adminConfig');
const { formatEmailSummary } = require('./emailSummary');

const app = express();
const PORT = process.env.PORT || 8000;
const ADMIN_EMAIL = 'info@globalvisatravel.org';
const DATA_FILE = path.join(__dirname, 'data.json');
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

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ applications: [], offers: [] }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

async function sendAdminNotification(subject, payload) {
  if (!transporter) {
    console.warn('Email sending skipped: set SMTP_USER and SMTP_PASS (or EMAIL_USER and EMAIL_PASS) to enable SMTP delivery.');
    return;
  }

  const emailBody = formatEmailSummary(payload);

  await transporter.sendMail({
    from: SMTP_FROM,
    to: ADMIN_EMAIL,
    subject,
    text: emailBody,
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/application', async (req, res) => {
  try {
    const payload = req.body;
    const data = readData();
    data.applications.unshift({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    });
    writeData(data);

    try {
      await sendAdminNotification(payload.type ? `New ${payload.type}` : 'New Travel Application', payload);
    } catch (error) {
      console.warn('Application saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Application received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting application' });
  }
});

app.post('/api/document-help', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = readData();
    data.documentHelpRequests = data.documentHelpRequests || [];
    data.documentHelpRequests.unshift({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      email: payload.email || '',
      currentCountry: payload.currentCountry || '',
      destinationCountry: payload.destinationCountry || '',
      documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [payload.documentTypes].filter(Boolean),
    });
    writeData(data);

    try {
      await sendAdminNotification('New Document Help Request', {
        name: payload.name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        currentCountry: payload.currentCountry || '',
        destinationCountry: payload.destinationCountry || '',
        documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [payload.documentTypes].filter(Boolean),
      });
    } catch (error) {
      console.warn('Document help request saved, but email notification failed:', error.message);
    }

    try {
      await sendAdminNotification('New Document Help Request', {
        name: payload.name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        currentCountry: payload.currentCountry || '',
        destinationCountry: payload.destinationCountry || '',
        documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [payload.documentTypes].filter(Boolean),
      });
    } catch (error) {
      console.warn('Document help request saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Document help request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting document request' });
  }
});

app.post('/api/study-abroad', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = readData();
    const selectedCountries = Array.isArray(payload.countryChoice)
      ? payload.countryChoice
      : String(payload.countryChoice || '').split(',').map((item) => item.trim()).filter(Boolean);

    data.studyAbroadRequests = data.studyAbroadRequests || [];
    data.studyAbroadRequests.unshift({
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
    });
    writeData(data);

    try {
      await sendAdminNotification('New Study Abroad Request', {
        name: payload.name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        qualification: payload.qualification || '',
        program: payload.program || '',
        degreeType: payload.degreeType || '',
        countryChoice: selectedCountries,
        programType: payload.programType || '',
      });
    } catch (error) {
      console.warn('Study abroad request saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Study abroad request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting study abroad request' });
  }
});

app.post('/api/work-abroad', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = readData();
    const selectedCountries = Array.isArray(payload.countryChoice)
      ? payload.countryChoice
      : String(payload.countryChoice || '').split(',').map((item) => item.trim()).filter(Boolean);

    data.workAbroadRequests = data.workAbroadRequests || [];
    data.workAbroadRequests.unshift({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      name: payload.name || '',
      phone: payload.phone || '',
      email: payload.email || '',
      qualification: payload.qualification || '',
      countryChoice: selectedCountries,
    });
    writeData(data);

    try {
      await sendAdminNotification('New Work Abroad Request', {
        name: payload.name || '',
        phone: payload.phone || '',
        email: payload.email || '',
        qualification: payload.qualification || '',
        countryChoice: selectedCountries,
      });
    } catch (error) {
      console.warn('Work abroad request saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Work abroad request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting work abroad request' });
  }
});

app.post('/api/flight-booking', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = readData();

    data.flightBookings = data.flightBookings || [];
    data.flightBookings.unshift({
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
    });
    writeData(data);

    try {
      await sendAdminNotification('New Flight Booking Request', {
        currentCountry: payload.currentCountry || '',
        currentAirport: payload.currentAirport || '',
        destinationCountry: payload.destinationCountry || '',
        destinationAirport: payload.destinationAirport || '',
        destinationCity: payload.destinationCity || '',
        departureDate: payload.departureDate || '',
        returnDate: payload.returnDate || '',
        airline: payload.airline || 'No preference',
      });
    } catch (error) {
      console.warn('Flight booking request saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Flight booking request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting flight booking request' });
  }
});

app.post('/api/hotel-booking', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = readData();

    data.hotelBookings = data.hotelBookings || [];
    data.hotelBookings.unshift({
      id: Date.now(),
      createdAt: new Date().toISOString(),
      destinationCountry: payload.destinationCountry || '',
      destinationCity: payload.destinationCity || '',
      checkInDate: payload.checkInDate || '',
      checkOutDate: payload.checkOutDate || '',
      adults: payload.adults || '',
      kids: payload.kids || '',
    });
    writeData(data);

    try {
      await sendAdminNotification('New Hotel Booking Request', {
        destinationCountry: payload.destinationCountry || '',
        destinationCity: payload.destinationCity || '',
        checkInDate: payload.checkInDate || '',
        checkOutDate: payload.checkOutDate || '',
        adults: payload.adults || '',
        kids: payload.kids || '',
      });
    } catch (error) {
      console.warn('Hotel booking request saved, but email notification failed:', error.message);
    }

    res.status(200).json({ success: true, message: 'Hotel reservation request received' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error submitting hotel reservation request' });
  }
});

app.post('/api/offers', upload.single('image'), (req, res) => {
  try {
    const payload = req.body || {};
    const file = req.file;
    const imagePath = file ? `/uploads/offers/${file.filename}` : payload.image || '';
    const data = readData();

    data.offers.unshift({
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

    writeData(data);
    res.status(200).json({ success: true, message: 'Offer published', image: imagePath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error publishing offer' });
  }
});

app.get('/api/applications', (req, res) => {
  const data = readData();
  res.json({ applications: data.applications || [] });
});

app.delete('/api/applications/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.applications = (data.applications || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting application' });
  }
});

app.get('/api/document-help', (req, res) => {
  const data = readData();
  res.json({ requests: data.documentHelpRequests || [] });
});

app.delete('/api/document-help/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.documentHelpRequests = (data.documentHelpRequests || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Document help request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting document request' });
  }
});

app.get('/api/study-abroad', (req, res) => {
  const data = readData();
  res.json({ requests: data.studyAbroadRequests || [] });
});

app.delete('/api/study-abroad/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.studyAbroadRequests = (data.studyAbroadRequests || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Study abroad request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting study abroad request' });
  }
});

app.get('/api/work-abroad', (req, res) => {
  const data = readData();
  res.json({ requests: data.workAbroadRequests || [] });
});

app.delete('/api/work-abroad/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.workAbroadRequests = (data.workAbroadRequests || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Work abroad request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting work abroad request' });
  }
});

app.get('/api/flight-booking', (req, res) => {
  const data = readData();
  res.json({ requests: data.flightBookings || [] });
});

app.delete('/api/flight-booking/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.flightBookings = (data.flightBookings || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Flight booking request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting flight booking request' });
  }
});

app.get('/api/hotel-booking', (req, res) => {
  const data = readData();
  res.json({ requests: data.hotelBookings || [] });
});

app.delete('/api/hotel-booking/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    data.hotelBookings = (data.hotelBookings || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
    res.json({ success: true, message: 'Hotel reservation request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error deleting hotel reservation request' });
  }
});

app.get('/api/offers', (req, res) => {
  const data = readData();
  res.json({ offers: data.offers || [] });
});

app.delete('/api/offers/:id', (req, res) => {
  try {
    const data = readData();
    const targetId = Number(req.params.id);
    const offer = (data.offers || []).find((item) => Number(item.id) === targetId);
    if (offer && offer.image) {
      const imagePath = path.join(__dirname, offer.image.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    data.offers = (data.offers || []).filter((item) => Number(item.id) !== targetId);
    writeData(data);
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
