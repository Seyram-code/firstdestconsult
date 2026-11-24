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
2. Set either `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, or
   a MySQL connection URI in `DB_URL` (or `DATABASE_URL`) in the Node.js app's
   Hostinger environment settings. Set `ADMIN_ACCESS_CODE` there as well. Use
   the connection details exactly as shown in hPanel.
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

Public CSS, JavaScript, and image assets are cached for five minutes. API
responses and private application documents are not covered by this cache.

For FROG SMS, request the API key and username from FROG account settings, then
set `FROG_SMS_USERNAME`, `FROG_SMS_API_KEY`, and an approved
`FROG_SMS_SENDER_ID`. The integration uses
`https://frogapi.wigal.com.gh/api/v3/sms/send`. Keep credentials in each
environment's private settings, never in Git. `.env.example` lists all supported
variables.

## Job and opportunity applications

When publishing an offer in the admin portal, select the required documents:
passport biodata page, passport-size picture, full-length picture, educational
certificates, academic transcript, CV / Resume, bank statement, business
certificate, and other documents. Admins can also enter custom document names
one per line. Up to 8 documents can be requested. Visitors can open the
opportunity, complete the application form, and upload each requested document
as PDF, Word, JPG, or PNG (8 MB max per file). Applications appear under
**Opportunity Applications** in the admin portal, where uploaded files can be
downloaded after admin login. Uploaded documents are kept outside the public
uploads directory. If an opportunity has no required documents, applicants can
still attach optional supporting documents in the application form.

For study offers, admins select one or more programs across the Skilled Trade &
Construction, Healthcare & Caregiving, Hospitality, Tourism & Culinary,
Business, Admin & IT, Beauty, Fashion & Creative, and Transport & Logistics
catalogs. Applicants choose one of the programs listed for that offer; the
selected program is included in the admin application record and the applicant's
confirmation email.
