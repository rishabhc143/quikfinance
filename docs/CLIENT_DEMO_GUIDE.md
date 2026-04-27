# QuikFinance Client Demo Guide

Live app:
- `https://quikfinance.vercel.app`

## 1. Login And Setup

1. Open the app and sign in.
2. If this is a new company, the app opens `Company Setup`.
3. Fill:
   - company name
   - email and phone
   - address
   - state and country
   - base currency
   - fiscal year
   - invoice prefix
4. Save the setup.
5. Seed the default chart of accounts if needed.

What to explain:
- This is the one-time business configuration step.
- QuikFinance does not allow the main dashboard flow until the company basics are configured.

## 2. Add Master Data

Before transactions, add:
- `Customers`
- `Vendors`
- `Items`
- `Bank Accounts`

Recommended demo order:
1. Create one customer
2. Create one vendor
3. Create one item/service
4. Create one bank account

What to explain:
- These are the reusable business masters.
- Once these are added, invoicing and billing become faster and more accurate.

## 3. Create A Sales Invoice

Route:
- `Invoices` -> `New`

Steps:
1. Select customer
2. Add one or more line items
3. Enter quantity and rate
4. GST is calculated automatically
5. Save/send the invoice

What to explain:
- The backend calculates totals, GST, and balance due.
- Posting an invoice updates receivables and accounting journals.

## 4. Record Customer Payment

From the invoice:
1. Open the invoice
2. Click record payment
3. Select payment date, method, and bank account
4. Save payment

What to explain:
- The invoice status moves from unpaid to partial or paid.
- Bank balance and accounting entries update automatically.

## 5. Create A Purchase Bill

Route:
- `Bills` -> `New`

Steps:
1. Select vendor
2. Add line items
3. Review GST input
4. Save/approve the bill

What to explain:
- This tracks supplier payables and GST input credit.
- A posted bill creates the accounting journal automatically.

## 6. Record Vendor Payment

From the bill:
1. Open the bill
2. Record payment
3. Choose bank account and payment method
4. Save

What to explain:
- Bill balance reduces to zero when fully paid.
- Payables and bank balances update immediately.

## 7. Record Expenses

Route:
- `Expenses` -> `New`

Steps:
1. Choose expense account/category
2. Link vendor if applicable
3. Enter amount and GST
4. Choose bank account
5. Save

What to explain:
- Expenses are posted directly to accounting.
- GST input on expenses is also tracked.

## 8. OCR Bill Capture

Route:
- `OCR Billing`

Steps:
1. Upload a bill file
2. Parse OCR text
3. Review extracted fields
4. Create draft bill from OCR

What to explain:
- OCR reduces manual entry.
- The user can still review and correct the extracted data before final posting.

## 9. Dashboard And Reports

Use these screens after transactions:
- `Dashboard`
- `Reports -> GST Summary`
- `Reports -> GST Parity`
- `Reports -> Profit & Loss`
- `Reports -> Balance Sheet`
- `Reports -> Cash Flow`

What to explain:
- Dashboard values come from real transactions.
- GST Summary shows output vs input tax.
- GST Parity highlights GST mismatches or missing-tax issues.

## 10. Recommended Demo Script

Best live demo order:
1. Login
2. Show company settings
3. Add customer
4. Add vendor
5. Add item
6. Add bank account
7. Create invoice
8. Record customer payment
9. Create bill
10. Record vendor payment
11. Add expense
12. Show OCR bill capture
13. Show dashboard
14. Show GST reports
15. Show financial reports

## 11. Key Talking Points

- QuikFinance is transaction-driven, not just a dashboard UI.
- Invoices, bills, payments, and expenses create live accounting effects.
- GST tracking is built into sales, purchases, and expenses.
- OCR helps convert uploaded bills into draft accounting records.
- The product is suitable for demos and operational pilot usage.

