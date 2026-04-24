# Accounting Logic

## Chart of Accounts

Default accounts are seeded per organization through `seed_default_accounts`.

Key system accounts include:

- Operating Bank
- Cash on Hand
- Accounts Receivable
- Inventory Asset
- Accounts Payable
- Tax Payable
- Tax Recoverable
- Owner Equity
- Sales Revenue
- Service Revenue
- Cost of Goods Sold
- Office Expenses
- Travel Expenses
- Software Subscriptions

## Journal Entries

Journal entries live in:

- `journal_entries`
- `journal_entry_lines`

The database enforces balanced posted entries through `ensure_journal_balanced` and `validate_posted_journal_entry`.

## Invoice Accounting

Target accounting behavior:

- Debit Accounts Receivable
- Credit revenue
- Credit output GST accounts

Current app stores invoice totals and supports invoice-linked payment collection and reporting.

## Bill Accounting

Target accounting behavior:

- Debit expense or inventory
- Debit input GST accounts
- Credit Accounts Payable

Current app stores bill totals and supports payable tracking, OCR bill drafting, and payment posting.

## Payment Accounting

Customer payments:

- Debit bank/cash
- Credit receivable

Vendor payments:

- Debit payable
- Credit bank/cash

## GST Accounting

Same-state supply:

- split GST into CGST and SGST

Interstate supply:

- apply IGST

Reports currently aggregate from transaction records and period filters.
