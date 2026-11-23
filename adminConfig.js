const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || '';
const ADMIN_CONFIG_PATH = process.env.ADMIN_CONFIG_PATH || path.join(__dirname, 'admin-config.json');

function readConfig() {
  if (!fs.existsSync(ADMIN_CONFIG_PATH)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getAdminAccessCode() {
  const config = readConfig();
  return config.accessCode || DEFAULT_ADMIN_ACCESS_CODE || null;
}

function resetAdminAccessCode(currentCode, newCode) {
  const normalizedCurrent = String(currentCode || '').trim();
  const normalizedNew = String(newCode || '').trim();
  const currentAccessCode = getAdminAccessCode();

  if (!currentAccessCode) {
    throw new Error('Admin access code is not configured. Set ADMIN_ACCESS_CODE.');
  }

  if (normalizedCurrent !== currentAccessCode) {
    throw new Error('Incorrect current admin access code.');
  }

  if (!normalizedNew || normalizedNew.length < 6) {
    throw new Error('New admin access code must be at least 6 characters long.');
  }

  const config = readConfig();
  config.accessCode = normalizedNew;
  writeConfig(config);

  return { success: true, code: normalizedNew };
}

module.exports = {
  DEFAULT_ADMIN_ACCESS_CODE,
  ADMIN_CONFIG_PATH,
  getAdminAccessCode,
  resetAdminAccessCode,
};
