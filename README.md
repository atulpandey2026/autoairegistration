# Auto AI Expo Registration — Next.js + MySQL

A separate registration application intended to connect to the existing Auto AI Expo website through a registration button. The existing website is not modified. This project uses Next.js, MySQL, and Nodemailer over SMTP; it does not use Supabase, Firebase, or Resend.

## Included in this ZIP

- Responsive registration form based on the provided PHP form and price rules.
- Primary contact and billing fields.
- Dynamic delegate cards (1–100), pass category and GST calculation.
- Server-side validation and honeypot spam field.
- Transactional MySQL registration/delegate saves.
- Unique registration reference and success page.
- Acknowledgement and admin email queue; attempts immediate SMTP delivery and retains failures in the queue.
- Admin sign-in with hashed passwords and signed, HTTP-only session cookie.
- Registration dashboard, search, status/payment updates, summary cards, CSV export.
- SQL schema and Hostinger deployment notes.

## Current release limitations

This is a functional first release, not a fully feature-complete replacement for every legacy PHP admin tool. Admin dashboard currently supports registration search, registration/payment status changes, and CSV export. It does not yet include editing/deleting individual delegates, invoices/PDFs, payment gateway integration, or a scheduled email-queue retry screen. Email queue records with failed delivery remain in MySQL and can be retried by a future queue worker/admin feature. Pricing rules are currently the same as the supplied PHP form: 1 delegate ₹10,000 each; 2–4 delegates ₹8,000 each; 5+ delegates ₹7,000 each; GST defaults to 18%.

## Before deployment

1. In Hostinger hPanel, create a **new MySQL database and database user** for this application. Do not reuse the existing PHP database credentials.
2. Open phpMyAdmin for the new database and import `database/schema.sql`.
3. Confirm your Cloud Startup plan's Node.js application setup supports the Next.js version in this package. Configure the app root, Node version, build/start commands, and environment variables using Hostinger's Node.js deployment UI. Hostinger's interface may differ by plan/region.
4. Copy `.env.example` to `.env` locally or set equivalent variables in Hostinger's environment settings. Never upload `.env` into a publicly served static directory or commit it to source control.
5. Fill in the new database credentials, a random `SESSION_SECRET` of 32+ characters, and your SMTP mailbox details.
6. Set `APP_URL=https://register.autoaiexpo.com` if using that subdomain. Point the subdomain to the Node.js application in hPanel and enable SSL.
7. Install dependencies with `npm install`; run `npm run build`; start with `npm start` as required by the Hostinger Node.js panel.
8. Create an initial admin by setting `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` in `.env`, then run `npm run create-admin` in a terminal where Node.js is available. Remove `ADMIN_INITIAL_PASSWORD` after setup. If Hostinger does not provide a shell/terminal for the app, run the script locally against a temporarily IP-restricted DB connection or use a secure one-time seed method; do not expose a public setup endpoint.
9. Test with a non-production registration before linking it from the main site. Check registration, delegates, email_queue, SMTP delivery, login, status updates, and CSV export.
10. Add a button/link on the existing site to `https://register.autoaiexpo.com`. No changes to the existing website are required beyond that link.

## Environment variables

See `.env.example`. `NEXT_PUBLIC_GST_RATE` is optional for displaying the GST rate in the browser; it defaults to 18. `GST_RATE` is the server-side authoritative rate. Keep them equal if you change GST.

## Local development

```bash
cp .env.example .env
# Edit .env, import database/schema.sql into your local MySQL database
npm install
npm run dev
```

Open `http://localhost:3000`. Admin login: `http://localhost:3000/admin/login`.

## Hosting/security notes

- Do not share database, SMTP, or admin passwords in chat or source files.
- Use a unique MySQL user restricted to this database and a strong password.
- Use HTTPS and a strong `SESSION_SECRET` in production.
- This app uses server-side validation, prepared SQL statements, bcrypt password hashes, an HTTP-only signed cookie, and a same-origin check. Add a reverse-proxy rate limit/WAF before production traffic.
- Back up the new database before upgrades.
- SMTP delivery depends on correct mailbox credentials and Hostinger's SMTP policies. The app stores email messages in `email_queue`; delivery failures do not undo a saved registration.
- Verify event date and pricing before launch. The source form says 25–26 February 2026; update it if this registration is for a future edition.
