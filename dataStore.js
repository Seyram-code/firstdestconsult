const mysql = require('mysql2/promise');

const COLLECTIONS = Object.freeze([
  'applications',
  'documentHelpRequests',
  'studyAbroadRequests',
  'workAbroadRequests',
  'flightBookings',
  'hotelBookings',
  'offers',
  'offerApplications',
]);

const collectionSet = new Set(COLLECTIONS);
let pool;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DB_URL || process.env.DATABASE_URL;
    const poolOptions = {
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: false,
    };

    if (databaseUrl) {
      pool = mysql.createPool({ uri: databaseUrl, ...poolOptions });
    } else {
      const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
      const missing = required.filter((name) => !process.env[name]);
      if (missing.length) {
        throw new Error(`Missing MySQL configuration: ${missing.join(', ')} or DB_URL.`);
      }

      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        ...poolOptions,
      });
    }
  }
  return pool;
}

function assertCollection(collection) {
  if (!collectionSet.has(collection)) {
    throw new Error(`Unknown data collection: ${collection}`);
  }
}

function assertRecordId(id) {
  const normalizedId = String(id);
  if (!/^\d+$/.test(normalizedId)) {
    throw new Error('Record ID must be a positive integer.');
  }
  return normalizedId;
}

async function initializeDatabase() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_records (
      collection VARCHAR(40) NOT NULL,
      record_id BIGINT UNSIGNED NOT NULL,
      payload JSON NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (collection, record_id),
      KEY app_records_created_at (collection, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function pingDatabase() {
  await getPool().query('SELECT 1');
}

async function listRecords(collection) {
  assertCollection(collection);
  const [rows] = await getPool().execute(
    'SELECT payload FROM app_records WHERE collection = ? ORDER BY record_id DESC',
    [collection],
  );
  return rows.map((row) => row.payload);
}

async function insertRecord(collection, record) {
  assertCollection(collection);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Record must be an object.');
  }
  const id = assertRecordId(record.id);
  await getPool().execute(
    'INSERT INTO app_records (collection, record_id, payload) VALUES (?, ?, ?)',
    [collection, id, JSON.stringify(record)],
  );
}

async function updateRecord(collection, record) {
  assertCollection(collection);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Record must be an object.');
  }
  const id = assertRecordId(record.id);
  const [result] = await getPool().execute(
    'INSERT INTO app_records (collection, record_id, payload) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload)',
    [collection, id, JSON.stringify(record)],
  );
  return result.affectedRows > 0;
}

async function findRecord(collection, id) {
  assertCollection(collection);
  const [rows] = await getPool().execute(
    'SELECT payload FROM app_records WHERE collection = ? AND record_id = ? LIMIT 1',
    [collection, assertRecordId(id)],
  );
  return rows.length ? rows[0].payload : null;
}

async function deleteRecord(collection, id) {
  assertCollection(collection);
  const [result] = await getPool().execute(
    'DELETE FROM app_records WHERE collection = ? AND record_id = ?',
    [collection, assertRecordId(id)],
  );
  return result.affectedRows > 0;
}

async function importRecords(recordsByCollection) {
  const db = getPool();
  const connection = await db.getConnection();
  const imported = {};

  try {
    await connection.beginTransaction();
    for (const collection of COLLECTIONS) {
      const records = recordsByCollection[collection] || [];
      if (!Array.isArray(records)) {
        throw new Error(`Expected ${collection} to be an array.`);
      }

      let count = 0;
      for (const record of records) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`Found an invalid record in ${collection}.`);
        }
        const [result] = await connection.execute(
          'INSERT IGNORE INTO app_records (collection, record_id, payload) VALUES (?, ?, ?)',
          [collection, assertRecordId(record.id), JSON.stringify(record)],
        );
        count += result.affectedRows;
      }
      imported[collection] = count;
    }
    await connection.commit();
    return imported;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  COLLECTIONS,
  closeDatabase,
  deleteRecord,
  findRecord,
  importRecords,
  initializeDatabase,
  insertRecord,
  listRecords,
  pingDatabase,
  updateRecord,
};
