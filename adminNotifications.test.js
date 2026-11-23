const test = require('node:test');
const assert = require('node:assert/strict');
const { FROG_SMS_ENDPOINT, createAdminNotifier } = require('./adminNotifications');

const logger = {
  warn() {},
  error() {},
};

test('sends email details and an SMS alert to the configured admin', async () => {
  let email;
  let sms;
  const notifyAdmin = createAdminNotifier({
    transporter: {
      async sendMail(message) {
        email = message;
      },
    },
    adminEmail: 'admin@example.com',
    adminPhone: '+233243499242',
    frogUsername: 'frog-user',
    frogApiKey: 'test-key',
    frogSenderId: 'FirstDest',
    fetchImpl: async (url, options) => {
      sms = { url, options, body: JSON.parse(options.body) };
      return { ok: true, status: 200 };
    },
    logger,
  });

  const result = await notifyAdmin('New Travel Application', { name: 'Ama Doe' });

  assert.deepEqual(result, { email: 'sent', sms: 'sent' });
  assert.equal(email.to, 'admin@example.com');
  assert.match(email.text, /name: Ama Doe/);
  assert.equal(sms.url, FROG_SMS_ENDPOINT);
  assert.equal(sms.options.headers['API-KEY'], 'test-key');
  assert.equal(sms.options.headers.USERNAME, 'frog-user');
  assert.equal(sms.body.senderid, 'FirstDest');
  assert.equal(sms.body.destinations[0].destination, '+233243499242');
  assert.match(sms.body.message, /New Travel Application received/);
});

test('reports independent delivery failures without losing successful email', async () => {
  const errors = [];
  const notifyAdmin = createAdminNotifier({
    transporter: { async sendMail() {} },
    adminEmail: 'admin@example.com',
    adminPhone: '+233243499242',
    frogUsername: 'frog-user',
    frogApiKey: 'test-key',
    frogSenderId: 'FirstDest',
    fetchImpl: async () => ({ ok: false, status: 401 }),
    logger: { warn() {}, error(...args) { errors.push(args); } },
  });

  const result = await notifyAdmin('New Request', {});

  assert.deepEqual(result, { email: 'sent', sms: 'failed' });
  assert.equal(errors.length, 1);
});

test('reports SMS as not configured until all FROG settings are present', async () => {
  let emailSent = false;
  const notifyAdmin = createAdminNotifier({
    transporter: { async sendMail() { emailSent = true; } },
    adminEmail: 'admin@example.com',
    adminPhone: '+233243499242',
    frogUsername: '',
    frogApiKey: '',
    frogSenderId: '',
    fetchImpl: async () => {
      throw new Error('Should not call FROG without credentials');
    },
    logger,
  });

  const result = await notifyAdmin('New Request', {});

  assert.equal(emailSent, true);
  assert.deepEqual(result, { email: 'sent', sms: 'not_configured' });
});
