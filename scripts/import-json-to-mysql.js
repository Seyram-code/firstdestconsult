require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  closeDatabase,
  importRecords,
  initializeDatabase,
} = require('../dataStore');

async function main() {
  const args = process.argv.slice(2);
  const allowRemote = args.includes('--allow-remote');
  const inputPathArg = args.find((argument) => argument !== '--allow-remote');
  const inputPath = path.resolve(inputPathArg || path.join(__dirname, '..', 'data.json'));
  if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST) && !allowRemote) {
    throw new Error('Refusing to send local JSON records to a remote database. Pass --allow-remote only if you intend to transfer them.');
  }
  const raw = await fs.readFile(inputPath, 'utf8');
  const records = JSON.parse(raw);
  await initializeDatabase();
  const imported = await importRecords(records);
  console.log(`Imported records from ${inputPath}:`);
  for (const [collection, count] of Object.entries(imported)) {
    console.log(`- ${collection}: ${count} new`);
  }
}

main()
  .catch((error) => {
    console.error(`JSON import failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
