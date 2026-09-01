# MFA Integration Monitor — Maximo for Aviation

A two-way Next.js application for Maximo Work Orders.

## Architecture

- **Outbound:** Maximo Work Order changes -> `/api/maximo/webhook` -> MySQL -> Outbound tab.
- **Inbound:** Web App -> `/api/maximo/inbound` -> Maximo REST API.
- **Deployment:** internal Linux host + PM2 + local MySQL. No Vercel dependency.

## UI

Exactly two tabs:

### Outbound
Shows Work Order data received from Maximo. The screen displays only:
Work Order, Work Required, Work Type, Status, Work Performed, Parent WO,
Status Code, Failure Class, Customer, Reported Date, Reported By.

The page polls `/api/latest` every 2 seconds.

### Inbound
Provides the same Work Order fields and exactly these operations:
- Retrieve the Work Order Details
- Create the Work Order
- Update the Work Order

Site and organization are configured server-side through `MAXIMO_DEFAULT_SITE` and `MAXIMO_DEFAULT_ORG`; they are not extra UI fields.

## MySQL

The Linux host already has database `maximo_integration` and user `maximo_app`.
**This repository intentionally creates no application tables.**

The outbound code is prepared for a future `maximo_events` table. The current code expects:
- `id`
- `received_at`
- `payload` (JSON)

This is a future contract, not a migration. Finalize/approve the database design before creating tables.

## Setup on Linux

Create `.env.local` from `.env.example` and fill real secrets.

```bash
npm install
npm run build
npm start
```

Health check:

```text
http://localhost:3000/api/health
```

PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Later:

```bash
git pull
npm install
npm run build
pm2 restart mfa-app
```

## Security

Never commit `.env.local`, MySQL passwords, or Maximo API keys. The Maximo API key is server-side only.

If Maximo uses an internal/private CA, install the trusted CA on the Linux host rather than disabling TLS verification globally.

## Database development order

1. Finalize the Work Order/UI data requirements.
2. Define versioned SQL migrations under `db/migrations/`.
3. Apply and test the migration locally.
4. Test Maximo -> webhook -> MySQL -> Outbound.
5. Test Inbound -> Maximo.
6. Retire the old Upstash/Redis implementation only after end-to-end testing succeeds.
