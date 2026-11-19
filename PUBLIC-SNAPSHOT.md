# Anonymized web application snapshot

This branch adds the current web application alongside the existing Telegram bot. The working production directory was not changed.

Personal owner details, business registration numbers, contact details, deployment IP, production domain and machine-specific paths are replaced with examples. Environment files, SSH keys, runtime databases, backups, provider response dumps, private filing worksheets and screenshots are excluded. The included image assets are storefront/generated demonstration assets, not customer uploads.

Run locally: `cd web`, `npm ci`, copy `.env.example` to `.env`, configure a fresh authentication secret, then `npm run db:migrate` and `npm start`. Node 24.15+ is required. Run `npm test` for checks.

Before deploying this public snapshot, configure your own domain, legal content and deployment target. The source workspace and live website retain their real configuration; this is a sanitized distribution copy, not a replacement for the private deployment tree.
