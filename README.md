# QuikFinance

QuikFinance is a Next.js 14 + Supabase accounting SaaS for small businesses. It supports company onboarding, chart of accounts, customers, vendors, items, invoices, bills, expenses, payments, GST reporting, OCR bill ingestion, Razorpay payment links, dashboards, reports, and audit logs.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Supabase Auth + Postgres + RLS
- Tailwind CSS
- TanStack Query
- Zod
- React Hook Form
- Recharts
- React PDF

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` from `.env.example`

3. Apply Supabase migrations

```bash
supabase db push
```

4. Start development server

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Environment Variables

Required for core app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Optional but supported:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_SUPPORT_MODEL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `OCR_API_KEY`
- `UPLOAD_STORAGE_PROVIDER`
- `APP_URL`

Notes:

- Missing Google or Razorpay keys do not crash the app. Those features show safe disabled behavior.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.

## Database

Main schema areas:

- Organizations and profiles
- Accounts and tax rates
- Customers/vendors via `contacts`
- Items
- Invoices, bills, payments, expenses
- Journal entries and journal lines
- Bank accounts and reconciliation
- OCR documents and payment links
- Reports, workflows, audit logs

Latest onboarding/company setup migration added:

- `business_type`
- `industry`
- `website`
- `country`
- `city`
- `pin_code`
- `gst_registered`
- `gst_filing_frequency`
- `place_of_supply`
- `accounting_method`
- `fiscal_year_start_date`
- `fiscal_year_end_date`
- `fiscal_year_start_month`
- `invoice_next_number`
- `payment_terms`
- `setup_completed`

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run start
```

## Deployment

1. Import the repo into Vercel
2. Add the same environment variables used locally
3. Run Supabase migrations against production
4. Deploy

The project is Vercel-compatible and `npm run build` passes.

## Demo Workflow

1. Register a new user with company name and base currency
2. Sign in
3. Complete `/company-setup`
4. Review or seed default chart of accounts
5. Add a bank account, customer, vendor, and item
6. Create invoices and bills
7. Record payments
8. Review dashboard and reports
9. Use OCR billing and Razorpay where configured
10. Review audit logs

## Known Limitations

- Dedicated onboarding and route gating are implemented, but not every transaction page has a fully custom line-item UX yet.
- A number of modules still use generalized CRUD forms rather than purpose-built transaction editors.
- Razorpay payment-link creation and webhook sync are implemented, but live payments require valid production credentials.
- OCR works with current OCR pipeline and development fallback, but production extraction quality depends on provider configuration.

## Additional Docs

- `docs/APP_WORKFLOW.md`
- `docs/ACCOUNTING_LOGIC.md`
- `docs/TESTING_CHECKLIST.md`
