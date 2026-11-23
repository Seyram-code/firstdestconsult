# First Dest Consult

First Dest Consult's travel and visa services website.

## Run locally

1. Install dependencies with `npm ci`.
2. Ensure the local MySQL service is running.
3. Run `npm run db:setup-local`. This creates the local `firstdestconsult`
   database and restricted app user, generates local credentials, and saves
   them in `.env` with file permissions restricted to your account. It connects
   as the local MySQL `root` user by default; set `MYSQL_ADMIN_USER` or
   `MYSQL_ADMIN_PASSWORD` in `.env` if your MySQL installation requires them.
4. Import existing local submissions and offers with `npm run db:import-json`.
   The import is idempotent and keeps `data.json` unchanged as a backup.
5. Start the server with `npm start` and open <http://localhost:8000>.

The server creates the MySQL table on startup. All submissions, bookings, and
offers are stored as JSON payloads in the `app_records` table, preserving the
existing API data format. Local submissions and credentials are excluded from Git.
The local JSON import refuses remote hosts unless `--allow-remote` is explicitly
passed.

## Hostinger MySQL

The app uses the same MySQL schema locally and on Hostinger, but each environment
has its own database and credentials:

1. In Hostinger hPanel, create a MySQL database and user, and grant the user
   access to that database.
2. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and
   `ADMIN_ACCESS_CODE` in the Node.js app's Hostinger environment settings. Use
   the hostname, database name, and username exactly as shown in hPanel.
3. Deploy/restart the app. It creates `app_records` automatically using the
   configured database user.

Do not copy local `.env` credentials to Hostinger. The JSON import command
imports the local `data.json` into whichever database is configured; do not run
it against production unless you explicitly intend to transfer those records.
If you do, use `npm run db:import-json -- --allow-remote` only after confirming
the production database settings and deciding to transfer the personal data.
Configure SMTP credentials in each environment separately to enable email
notifications. Applicant requests send an email with the request details and an
SMS alert to the configured admin email and phone when both channels are
configured. Delivery outcomes are returned under the API response's
`notifications` field and failed delivery is logged; saving a request does not
depend on notification delivery.

For FROG SMS, request the API key and username from FROG account settings, then
set `FROG_SMS_USERNAME`, `FROG_SMS_API_KEY`, and an approved
`FROG_SMS_SENDER_ID`. The integration uses
`https://frogapi.wigal.com.gh/api/v3/sms/send`. Keep credentials in each
environment's private settings, never in Git. `.env.example` lists all supported
variables.
