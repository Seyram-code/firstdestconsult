# First Dest Consult

First Dest Consult's travel and visa services website.

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set a unique `ADMIN_ACCESS_CODE`.
3. Start the server with `npm start`.
4. Open <http://localhost:8000>.

Application submissions and admin settings are stored locally in `data.json`
and `admin-config.json`; these runtime files are intentionally excluded from Git.
Configure SMTP credentials in `.env` to enable email notifications.
