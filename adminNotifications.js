const { randomUUID } = require('node:crypto');
const { formatEmailSummary } = require('./emailSummary');

const FROG_SMS_ENDPOINT = 'https://frogapi.wigal.com.gh/api/v3/sms/send';

function createAdminNotifier({
  transporter,
  adminEmail,
  adminPhone,
  frogUsername,
  frogApiKey,
  frogSenderId,
  fetchImpl = globalThis.fetch,
  logger = console,
}) {
  async function sendEmail(subject, payload) {
    if (!transporter || !adminEmail) {
      return 'not_configured';
    }

    await transporter.sendMail({
      to: adminEmail,
      subject,
      text: formatEmailSummary(payload),
    });
    return 'sent';
  }

  async function sendSms(subject) {
    if (!adminPhone || !frogUsername || !frogApiKey || !frogSenderId) {
      return 'not_configured';
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('Fetch is unavailable; cannot send FROG SMS.');
    }

    const response = await fetchImpl(FROG_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': frogApiKey,
        USERNAME: frogUsername,
      },
      body: JSON.stringify({
        senderid: frogSenderId,
        destinations: [{
          destination: adminPhone,
          msgid: `FDT${randomUUID()}`,
        }],
        message: `${subject} received. Check ${adminEmail || 'the admin inbox'} for details.`,
        smstype: 'text',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`FROG SMS returned HTTP ${response.status}.`);
    }
    return 'sent';
  }

  async function deliver(channel, send) {
    try {
      const status = await send();
      if (status === 'not_configured') {
        logger.warn(`Admin ${channel} notification is not configured.`);
      }
      return status;
    } catch (error) {
      logger.error(`Admin ${channel} notification failed:`, error.message);
      return 'failed';
    }
  }

  return async function notifyAdmin(subject, payload) {
    const [email, sms] = await Promise.all([
      deliver('email', () => sendEmail(subject, payload)),
      deliver('SMS', () => sendSms(subject)),
    ]);
    return { email, sms };
  };
}

function createApplicantNotifier({ transporter, from, logger = console }) {
  return async function notifyApplicant(email, subject, name, details = {}) {
    const normalizedEmail = String(email || '').trim();
    if (!transporter || !normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return 'not_configured';
    }

    const detailText = Object.entries(details)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value ?? 'Not provided')}`)
      .join('\n');

    try {
      await transporter.sendMail({
        to: normalizedEmail,
        from,
        subject: `First Dest Consult — ${subject}`,
        text: `Dear ${name || 'Applicant'},\n\nThank you for contacting First Dest Consult. We have received your ${subject.toLowerCase()} and will review it shortly.\n\nSubmission details:\n${detailText}\n\nKind regards,\nFirst Dest Consult\ninfo@firstdestltd.com`,
      });
      return 'sent';
    } catch (error) {
      logger.error('Applicant confirmation email failed:', error.message);
      return 'failed';
    }
  };
}

module.exports = {
  FROG_SMS_ENDPOINT,
  createAdminNotifier,
  createApplicantNotifier,
};
