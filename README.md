# QuikFinance

QuikFinance is a production-oriented accounting workspace built with Next.js 14, TypeScript, Supabase, Tailwind CSS, shadcn-style Radix primitives, TanStack Query, Zustand, Recharts, React PDF, Resend, Zod, and Dinero.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Supabase CLI
- A Supabase project with email/password auth and Google OAuth configured
- A Resend account for transactional invoice email

## One Command Setup

```bash
npm install && supabase db push && npm run dev
```

The app runs at `http://localhost:3000`.

## Environment

Create `.env.local` from `.env.local.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key used by browser and route handlers
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for maintenance scripts
- `NEXT_PUBLIC_APP_URL`: deployed app URL
- `RESEND_API_KEY`: Resend API key for invoice delivery
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `RAZORPAY_KEY_ID`: Razorpay API key ID for invoice payment links
- `RAZORPAY_KEY_SECRET`: Razorpay secret key for payment-link creation
- `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook secret for payment and refund sync

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Database

The initial migration creates:

- Multi-tenant organizations and profiles
- Chart of accounts, currencies, exchange rates, tax rates, and default account seeding
- Customers, vendors, invoices, bills, payments, expenses, journal entries, bank reconciliation, reports, budgets, fixed assets, inventory, projects, recurring transactions, attachments, notifications, and audit logs
- Import jobs for CSV, Tally, Zoho Books, and bank statements
- Period locks for month-end close, OCR documents for bill drafting, Razorpay invoice payment links, and gateway event history
- Row Level Security policies scoped through `profiles.org_id`
- Audit, updated-at, onboarding, and balanced-journal enforcement functions
- Storage buckets for invoice PDFs and attachments

Apply it with:

```bash
supabase db push
```

## Development

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Deployment

1. Create a Vercel project from this repository.
2. Add the environment variables listed above.
3. Add Vercel project secrets named `supabase_url` and `supabase_anon_key`, matching `vercel.json`.
4. Run the Supabase migration against production.
5. Deploy with Vercel. The project is configured for the `bom1` region.

## Security Notes

- All API handlers require Supabase `getUser()` authentication.
- All tenant data is scoped by `org_id`.
- API bodies are validated with Zod.
- Mutations write audit log entries.
- List endpoints paginate with a default of 25 and a maximum of 100.
