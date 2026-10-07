# Production Records & Reporting Management System

Internal web application that replaces spreadsheet-based factory production recording.

The manager can record Morning, Afternoon, and Evening shift output (or mark no production), keep a product catalogue, and generate daily, monthly, quarterly, and yearly reports with Excel and PDF export.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS
- Zod validation
- ExcelJS + PDFKit
- Recharts

## Local development

```bash
cp .env.example .env
# set DATABASE_URL and AUTH_SECRET
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Development login

- Email: `manager@example.com`
- Password: `Manager123!`

Do not use this password in production. Set a strong `AUTH_SECRET` and create real users.

## Excel import

Settings → Import historical Excel data.

Preferred tabular sheet columns:

`Date | Shift | Product | Item Code | Quantity | Status | Reason | Remarks`

- Shift values: Morning, Afternoon, Evening
- Status `NO PRODUCTION` (or quantity/product text containing “No Production”) marks the shift
- Duplicate product+shift rows are skipped and listed in the import summary

The original `Production Metrics.xlsx` workbook was not present in this repository at build time. Place it under Settings import (or `data/`) when available.

## Deploy

Designed for Vercel + Supabase PostgreSQL:

1. Create a Supabase project and copy the Postgres URI into `DATABASE_URL`.
2. Set `AUTH_SECRET` in Vercel.
3. Run `prisma migrate deploy` against the remote database (CI or `vercel` build with `pnpm build`, which runs `prisma generate`).
4. Seed once: `pnpm db:seed` against production only if you want sample data.

## Tests

```bash
pnpm test
```
