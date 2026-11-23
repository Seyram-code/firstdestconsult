require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const envPath = path.join(__dirname, '..', '.env');
const adminConfigPath = path.join(__dirname, '..', 'admin-config.json');
const database = process.env.DB_NAME || 'firstdestconsult';
const username = process.env.DB_USER || 'firstdest_app';
const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || 3306);
const adminUser = process.env.MYSQL_ADMIN_USER || 'root';
const adminPassword = process.env.MYSQL_ADMIN_PASSWORD || '';

function assertIdentifier(value, label) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`${label} may only contain letters, numbers, and underscores.`);
  }
}

function setEnvValue(contents, name, value) {
  const line = `${name}=${value}`;
  const expression = new RegExp(`^${name}=.*$`, 'm');
  return expression.test(contents)
    ? contents.replace(expression, line)
    : `${contents.trimEnd()}\n${line}\n`;
}

async function main() {
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Local setup only connects to MySQL on this computer.');
  }
  assertIdentifier(database, 'DB_NAME');
  assertIdentifier(username, 'DB_USER');

  const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const configuredPassword = process.env.DB_PASSWORD;
  const appPassword = configuredPassword && !configuredPassword.startsWith('replace-with-')
    ? configuredPassword
    : crypto.randomBytes(32).toString('base64url');
  const configuredAdminCode = process.env.ADMIN_ACCESS_CODE;
  const adminCode = configuredAdminCode && !configuredAdminCode.startsWith('replace-with-')
    ? configuredAdminCode
    : crypto.randomBytes(24).toString('base64url');

  const connection = await mysql.createConnection({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${connection.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    const appAccount = `${connection.escape(username)}@${connection.escape('localhost')}`;
    const databaseGrant = `${connection.escapeId(database)}.*`;
    await connection.query(
      `CREATE USER IF NOT EXISTS ${appAccount} IDENTIFIED BY ${connection.escape(appPassword)}`,
    );
    await connection.query(
      `ALTER USER ${appAccount} IDENTIFIED BY ${connection.escape(appPassword)}`,
    );
    await connection.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON ${databaseGrant} TO ${appAccount}`,
    );
  } finally {
    await connection.end();
  }

  let updatedEnv = setEnvValue(currentEnv, 'DB_HOST', host);
  updatedEnv = setEnvValue(updatedEnv, 'DB_PORT', String(port));
  updatedEnv = setEnvValue(updatedEnv, 'DB_NAME', database);
  updatedEnv = setEnvValue(updatedEnv, 'DB_USER', username);
  updatedEnv = setEnvValue(updatedEnv, 'DB_PASSWORD', appPassword);
  updatedEnv = setEnvValue(updatedEnv, 'ADMIN_ACCESS_CODE', adminCode);
  fs.writeFileSync(envPath, updatedEnv, { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);

  let adminConfig = {};
  if (fs.existsSync(adminConfigPath)) {
    adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
    if (!adminConfig || typeof adminConfig !== 'object' || Array.isArray(adminConfig)) {
      throw new Error('admin-config.json must contain a JSON object.');
    }
  }
  adminConfig.accessCode = adminCode;
  fs.writeFileSync(adminConfigPath, JSON.stringify(adminConfig, null, 2), { mode: 0o600 });
  fs.chmodSync(adminConfigPath, 0o600);

  console.log(`Created/verified local MySQL database "${database}" and app user "${username}".`);
  console.log('Saved local connection settings and admin access code privately outside Git.');
}

main().catch((error) => {
  console.error(`Local MySQL setup failed: ${error.message}`);
  process.exitCode = 1;
});
