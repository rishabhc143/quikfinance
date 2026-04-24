# App Workflow

## Primary Flow

1. Register or sign in
2. Create company workspace automatically on first user creation
3. Complete `/company-setup`
4. Review default chart of accounts
5. Add master data
   - customers
   - vendors
   - items
   - bank accounts
6. Create transactions
   - invoices
   - bills
   - expenses
   - payments
7. Review GST
   - GST summary
   - GST parity
8. Use OCR billing
9. Use Razorpay payment links
10. Review reports and audit logs

## Routing

- `/login`
- `/register`
- `/company-setup`
- `/dashboard`
- `/customers`
- `/vendors`
- `/items`
- `/invoices`
- `/bills`
- `/expenses`
- `/payments`
- `/gst-summary`
- `/gst-parity`
- `/ocr-billing`
- `/settings/company`
- `/settings/audit-logs`

## Setup Gating

- Unauthenticated users are redirected to `/login`
- Authenticated users with incomplete setup are redirected to `/company-setup`
- Public pages redirect authenticated users to `/dashboard` or `/company-setup` depending on setup status
