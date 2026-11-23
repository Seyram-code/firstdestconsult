const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firstdest-admin-config-'));
const configPath = path.join(tempDir, 'admin-config.json');
process.env.ADMIN_CONFIG_PATH = configPath;
process.env.ADMIN_ACCESS_CODE = 'TestAdminCode@2026';

const adminConfig = require('./adminConfig');

test('uses the configured environment admin code when no custom code has been set', () => {
  const code = adminConfig.getAdminAccessCode();
  assert.equal(code, 'TestAdminCode@2026');
});

test('resetAdminAccessCode updates the stored access code after validating the current one', () => {
  const resetResult = adminConfig.resetAdminAccessCode('TestAdminCode@2026', 'NewAdmin@2026');
  assert.equal(resetResult.success, true);
  assert.equal(adminConfig.getAdminAccessCode(), 'NewAdmin@2026');
});

test('resetAdminAccessCode rejects an incorrect current code', () => {
  assert.throws(() => adminConfig.resetAdminAccessCode('WrongCode', 'Another@Code'), {
    message: 'Incorrect current admin access code.',
  });
});

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.ADMIN_CONFIG_PATH;
  delete process.env.ADMIN_ACCESS_CODE;
});
