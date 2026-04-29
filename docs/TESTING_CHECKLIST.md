# Testing Checklist

## Authentication

- Register new user
- Login user
- Logout user
- Protected route redirect to `/login`
- Incomplete setup redirect to `/company-setup`
- Verify `viewer` cannot create/update/post/reconcile data
- Verify `admin` cannot assign `owner` or `admin` role through user invites

## Company Setup

- Load company setup page
- Save company profile
- Seed default chart of accounts
- Complete setup successfully
- Edit setup from `/settings/company`
- Validate GSTIN required when GST registered

## Master Data

- Create customer
- Create vendor
- Create item/service
- Create bank account

## Invoices

- Create invoice
- Save invoice draft
- Mark invoice as sent
- Verify invoice journal posts tax into configured GST payable accounts
- Open invoice payment link page
- Generate invoice PDF

## Bills

- Create bill
- Create OCR draft bill
- Verify bill journal posts tax into configured GST recoverable accounts
- Record bill payment

## Expenses

- Create expense
- Verify dashboard and reports reflect expense

## Payments

- Record customer payment
- Record vendor payment
- Reject customer payment that exceeds invoice balance
- Reject vendor payment that exceeds bill balance
- Confirm dashboards update

## Banking And Settlement Controls

- Import bank feed as accountant/admin/owner
- Reject bank-feed import for restricted roles
- Match and clear reconciliation lines
- Confirm clearing a match opens a bank exception
- Save reconciliation with a non-zero difference and confirm exception creation
- Mark settlement as exception and confirm settlement exception creation
- Mark settlement as matched/posted and confirm settlement exception resolution

## GST

- Open GST summary
- Open GST parity
- Validate period filters

## OCR

- Upload OCR document
- Review OCR extracted fields
- Convert OCR document into bill

## Razorpay

- Create payment link when keys exist
- Verify webhook route accepts signed payload
- Confirm invoice status sync

## Reports

- Profit & loss
- Balance sheet
- Cash flow
- Outstanding
- GST summary
- GST parity

## Audit

- Open audit logs
- Verify company update audit entry
- Verify user invite audit entry
