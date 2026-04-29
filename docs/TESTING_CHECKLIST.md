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
- Verify low-stock items surface correctly when `quantity_on_hand <= reorder_point`

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
- Verify upload fallback keeps the OCR document even if attachment storage fails
- Review OCR extracted fields
- Verify OCR warnings and confidence score are shown after parse
- Verify duplicate OCR/bill detection opens a review exception
- Convert OCR document into bill
- Re-run OCR draft bill conversion and confirm it returns the existing linked bill instead of creating a duplicate

## Inventory And Warehouse Operations

- Create a stock movement with item and warehouse
- Post a stock receipt and confirm `items.quantity_on_hand` increases
- Post a stock issue and confirm `items.quantity_on_hand` decreases
- Post a stock receipt and confirm inventory accounting journal is created
- Post a stock issue/dispatch and confirm inventory asset is credited and COGS is debited
- Reject stock issue or dispatch that would drive quantity below zero
- Cancel a posted stock movement and confirm quantity is reversed
- Cancel a posted stock movement and confirm reversal journal is created
- Confirm low-stock exception opens when an item falls below reorder point
- Confirm low-stock exception resolves when stock is replenished
- Create and post a goods receipt tied to an item and warehouse

## Migration Center

- Create a migration batch with pasted CSV/JSON payload
- Confirm preview columns and sample rows are shown
- Confirm missing required fields mark the batch as needing review or failed
- Save mapping notes on a batch
- Mark a reviewed batch as ready/imported/failed

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

## Automated Regression

- Run `npm run test`
- Confirm OCR parser tests pass
- Confirm stock-control tests pass
- Confirm stock-accounting journal tests pass
- Confirm import-preview tests pass
