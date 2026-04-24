import type { ApiContext } from "@/lib/api/auth";
import type { ReportConfig } from "@/lib/reports";

type ContactLite = {
  id: string;
  display_name: string;
  tax_id?: string | null;
  state_code?: string | null;
};

type InvoiceLite = {
  id: string;
  contact_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  total: number;
  balance_due: number;
  status: string;
  place_of_supply?: string | null;
};

type BillLite = {
  id: string;
  contact_id: string;
  bill_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  total: number;
  balance_due: number;
  status: string;
  place_of_supply?: string | null;
};

type ExpenseLite = {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  status: string;
};

function matchesDateRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

async function fetchContacts(context: ApiContext) {
  const { data, error } = await context.supabase.from("contacts").select("id, display_name, tax_id, state_code").eq("org_id", context.orgId);
  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map(
      (contact) =>
        [
          String(contact.id),
          {
            id: String(contact.id),
            display_name: String(contact.display_name ?? "Unknown"),
            tax_id: typeof contact.tax_id === "string" ? contact.tax_id : null,
            state_code: typeof contact.state_code === "string" ? contact.state_code : null
          }
        ] satisfies [string, ContactLite]
    )
  );
}

async function fetchInvoices(context: ApiContext) {
  const { data, error } = await context.supabase
    .from("invoices")
    .select("id, contact_id, invoice_number, issue_date, due_date, subtotal, tax_total, total, balance_due, status, place_of_supply")
    .eq("org_id", context.orgId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as InvoiceLite[];
}

async function fetchBills(context: ApiContext) {
  const { data, error } = await context.supabase
    .from("bills")
    .select("id, contact_id, bill_number, issue_date, due_date, subtotal, tax_total, total, balance_due, status, place_of_supply")
    .eq("org_id", context.orgId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as BillLite[];
}

async function fetchExpenses(context: ApiContext) {
  const { data, error } = await context.supabase
    .from("expenses")
    .select("id, expense_date, description, amount, tax_amount, status")
    .eq("org_id", context.orgId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ExpenseLite[];
}

async function fetchTaxRates(context: ApiContext) {
  const { data, error } = await context.supabase.from("tax_rates").select("name, rate, tax_type, is_active").eq("org_id", context.orgId);
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

async function fetchOrganization(context: ApiContext) {
  const { data, error } = await context.supabase.from("organizations").select("id, state_code").eq("id", context.orgId).single();
  if (error) {
    throw new Error(error.message);
  }
  return data ?? { id: context.orgId, state_code: null };
}

function contactName(contacts: Map<string, ContactLite>, id: string) {
  return contacts.get(id)?.display_name ?? "Unknown";
}

export async function buildGstSummaryReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const [invoices, bills, expenses] = await Promise.all([fetchInvoices(context), fetchBills(context), fetchExpenses(context)]);

  const sales = invoices.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const purchases = bills.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const operatingExpenses = expenses.filter((row) => matchesDateRange(row.expense_date, from, to) && row.status !== "void");

  const salesTax = sales.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0);
  const purchaseTax = purchases.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0);
  const expenseTax = operatingExpenses.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
  const inputTax = purchaseTax + expenseTax;

  return {
    key: "gst-summary",
    title: "GST Summary",
    description: "Output GST, input GST, and the resulting net payable for the selected period.",
    apiPath: "/api/v1/reports/gst-summary",
    columns: [
      { key: "bucket", label: "Bucket" },
      { key: "taxable_value", label: "Taxable Value", kind: "money" },
      { key: "tax_amount", label: "GST", kind: "money" },
      { key: "documents", label: "Documents", kind: "number" }
    ],
    rows: [
      {
        id: "gst-sales",
        bucket: "Sales output GST",
        taxable_value: sales.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0),
        tax_amount: salesTax,
        documents: sales.length
      },
      {
        id: "gst-bills",
        bucket: "Bills input GST",
        taxable_value: purchases.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0),
        tax_amount: purchaseTax,
        documents: purchases.length
      },
      {
        id: "gst-expenses",
        bucket: "Expenses input GST",
        taxable_value: operatingExpenses.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
        tax_amount: expenseTax,
        documents: operatingExpenses.length
      }
    ],
    summary: [
      { label: "Output GST", value: salesTax, tone: salesTax > 0 ? "good" : "neutral" },
      { label: "Input GST", value: inputTax, tone: inputTax > 0 ? "neutral" : "warn" },
      { label: "Net payable", value: salesTax - inputTax, tone: salesTax - inputTax >= 0 ? "warn" : "good" }
    ]
  };
}

export async function buildGstParityReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const [invoices, bills, expenses, taxRates] = await Promise.all([
    fetchInvoices(context),
    fetchBills(context),
    fetchExpenses(context),
    fetchTaxRates(context)
  ]);

  const activeRates = taxRates.filter((rate) => Boolean(rate.is_active));
  const defaultRate = Number(activeRates[0]?.rate ?? 0) / 100;

  const sales = invoices.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const purchases = bills.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const operatingExpenses = expenses.filter((row) => matchesDateRange(row.expense_date, from, to) && row.status !== "void");

  const salesExpected = defaultRate > 0 ? sales.reduce((sum, row) => sum + Number(row.subtotal ?? 0) * defaultRate, 0) : sales.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0);
  const purchasesExpected =
    defaultRate > 0
      ? purchases.reduce((sum, row) => sum + Number(row.subtotal ?? 0) * defaultRate, 0) + operatingExpenses.reduce((sum, row) => sum + Number(row.amount ?? 0) * defaultRate, 0)
      : purchases.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0) + operatingExpenses.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);

  const salesActual = sales.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0);
  const purchasesActual = purchases.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0) + operatingExpenses.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
  const missingSalesTaxDocs = sales.filter((row) => Number(row.subtotal ?? 0) > 0 && Number(row.tax_total ?? 0) === 0).length;
  const missingPurchaseTaxDocs = [...purchases, ...operatingExpenses].filter((row) => Number("tax_total" in row ? row.tax_total : row.tax_amount) === 0).length;

  const rows = [
    {
      id: "parity-sales",
      check: "Sales GST parity",
      expected: Number(salesExpected.toFixed(2)),
      actual: Number(salesActual.toFixed(2)),
      variance: Number((salesActual - salesExpected).toFixed(2)),
      status: Math.abs(salesActual - salesExpected) < 1 ? "aligned" : "review"
    },
    {
      id: "parity-purchases",
      check: "Input GST parity",
      expected: Number(purchasesExpected.toFixed(2)),
      actual: Number(purchasesActual.toFixed(2)),
      variance: Number((purchasesActual - purchasesExpected).toFixed(2)),
      status: Math.abs(purchasesActual - purchasesExpected) < 1 ? "aligned" : "review"
    },
    {
      id: "parity-sales-coverage",
      check: "Sales docs missing GST",
      expected: 0,
      actual: missingSalesTaxDocs,
      variance: missingSalesTaxDocs,
      status: missingSalesTaxDocs === 0 ? "aligned" : "review"
    },
    {
      id: "parity-purchase-coverage",
      check: "Purchase docs missing GST",
      expected: 0,
      actual: missingPurchaseTaxDocs,
      variance: missingPurchaseTaxDocs,
      status: missingPurchaseTaxDocs === 0 ? "aligned" : "review"
    }
  ];

  return {
    key: "gst-parity",
    title: "GST Parity Checks",
    description: "Cross-check GST captured on documents against expected tax rates and highlight missing-tax documents.",
    apiPath: "/api/v1/reports/gst-parity",
    columns: [
      { key: "check", label: "Check" },
      { key: "expected", label: "Expected", kind: "money" },
      { key: "actual", label: "Actual", kind: "money" },
      { key: "variance", label: "Variance", kind: "money" },
      { key: "status", label: "Status" }
    ],
    rows,
    summary: [
      { label: "Active GST rates", value: activeRates.length, tone: activeRates.length > 0 ? "good" : "warn", kind: "number" },
      { label: "Checks flagged", value: rows.filter((row) => row.status !== "aligned").length, tone: rows.some((row) => row.status !== "aligned") ? "warn" : "good", kind: "number" },
      { label: "Default GST %", value: Number((defaultRate * 100).toFixed(2)), tone: "neutral", kind: "percent" }
    ]
  };
}

export async function buildOutstandingReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const [contacts, invoices, bills] = await Promise.all([fetchContacts(context), fetchInvoices(context), fetchBills(context)]);

  const outstandingInvoices = invoices.filter((row) => matchesDateRange(row.issue_date, from, to) && Number(row.balance_due ?? 0) > 0 && row.status !== "void");
  const outstandingBills = bills.filter((row) => matchesDateRange(row.issue_date, from, to) && Number(row.balance_due ?? 0) > 0 && row.status !== "void");

  const rows = [
    ...outstandingInvoices.map((row) => ({
      id: `ar-${row.id}`,
      type: "Receivable",
      contact: contactName(contacts, row.contact_id),
      document_number: row.invoice_number,
      due_date: row.due_date,
      balance_due: row.balance_due,
      status: row.status
    })),
    ...outstandingBills.map((row) => ({
      id: `ap-${row.id}`,
      type: "Payable",
      contact: contactName(contacts, row.contact_id),
      document_number: row.bill_number,
      due_date: row.due_date,
      balance_due: row.balance_due,
      status: row.status
    }))
  ];

  return {
    key: "outstanding",
    title: "Outstanding",
    description: "Open receivables and payables, ready for collections and AP follow-up.",
    apiPath: "/api/v1/reports/outstanding",
    columns: [
      { key: "type", label: "Type" },
      { key: "contact", label: "Contact" },
      { key: "document_number", label: "Document" },
      { key: "due_date", label: "Due date", kind: "text" },
      { key: "balance_due", label: "Balance", kind: "money" },
      { key: "status", label: "Status" }
    ],
    rows,
    summary: [
      { label: "Receivables", value: outstandingInvoices.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0), tone: "good" },
      { label: "Payables", value: outstandingBills.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0), tone: "warn" },
      { label: "Documents open", value: rows.length, tone: "neutral", kind: "number" }
    ]
  };
}

export async function buildGstr1Report(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const [contacts, invoices] = await Promise.all([fetchContacts(context), fetchInvoices(context)]);
  const rowsBySection = new Map<string, { documents: number; taxable_value: number; tax_amount: number }>();

  const register = (section: string, subtotal: number, taxAmount: number) => {
    const current = rowsBySection.get(section) ?? { documents: 0, taxable_value: 0, tax_amount: 0 };
    current.documents += 1;
    current.taxable_value += Number(subtotal ?? 0);
    current.tax_amount += Number(taxAmount ?? 0);
    rowsBySection.set(section, current);
  };

  invoices
    .filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void")
    .forEach((row) => {
      const contact = contacts.get(row.contact_id);
      const hasGstin = Boolean(contact?.tax_id);
      const section = hasGstin ? "B2B" : Number(row.total ?? 0) >= 250000 ? "B2CL" : "B2CS";
      register(section, Number(row.subtotal ?? 0), Number(row.tax_total ?? 0));
    });

  const rows = Array.from(rowsBySection.entries()).map(([section, aggregate]) => ({
    id: `gstr1-${section.toLowerCase()}`,
    section,
    documents: aggregate.documents,
    taxable_value: Number(aggregate.taxable_value.toFixed(2)),
    tax_amount: Number(aggregate.tax_amount.toFixed(2))
  }));

  return {
    key: "gstr-1",
    title: "GSTR-1",
    description: "Outward supply preparation grouped by B2B and B2C filing buckets.",
    apiPath: "/api/v1/reports/gstr-1",
    columns: [
      { key: "section", label: "Section" },
      { key: "documents", label: "Documents", kind: "number" },
      { key: "taxable_value", label: "Taxable Value", kind: "money" },
      { key: "tax_amount", label: "GST", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Taxable value", value: rows.reduce((sum, row) => sum + Number(row.taxable_value ?? 0), 0), tone: "neutral" },
      { label: "GST collected", value: rows.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0), tone: "warn" },
      { label: "Documents", value: rows.reduce((sum, row) => sum + Number(row.documents ?? 0), 0), tone: "good", kind: "number" }
    ]
  };
}

export async function buildGstr3bReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const [organization, contacts, invoices, bills, expenses] = await Promise.all([
    fetchOrganization(context),
    fetchContacts(context),
    fetchInvoices(context),
    fetchBills(context),
    fetchExpenses(context)
  ]);

  const outward = invoices.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const inward = bills.filter((row) => matchesDateRange(row.issue_date, from, to) && row.status !== "void");
  const expenseRows = expenses.filter((row) => matchesDateRange(row.expense_date, from, to) && row.status !== "void");

  const outwardSplit = outward.reduce(
    (totals, row) => {
      const contact = contacts.get(row.contact_id);
      const placeOfSupply = row.place_of_supply ?? contact?.state_code ?? organization.state_code ?? null;
      const isInterstate = Boolean(placeOfSupply && organization.state_code && placeOfSupply !== organization.state_code);
      const tax = Number(row.tax_total ?? 0);
      totals.taxable_value += Number(row.subtotal ?? 0);
      if (isInterstate) {
        totals.igst += tax;
      } else {
        totals.cgst += tax / 2;
        totals.sgst += tax / 2;
      }
      return totals;
    },
    { taxable_value: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  const inwardTax = inward.reduce((sum, row) => sum + Number(row.tax_total ?? 0), 0) + expenseRows.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
  const inwardSplit = {
    taxable_value: inward.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0) + expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    cgst: inwardTax / 2,
    sgst: inwardTax / 2,
    igst: 0
  };

  const rows = [
    {
      id: "gstr3b-outward",
      line_item: "Outward taxable supplies",
      taxable_value: Number(outwardSplit.taxable_value.toFixed(2)),
      cgst: Number(outwardSplit.cgst.toFixed(2)),
      sgst: Number(outwardSplit.sgst.toFixed(2)),
      igst: Number(outwardSplit.igst.toFixed(2))
    },
    {
      id: "gstr3b-itc",
      line_item: "Eligible ITC",
      taxable_value: Number(inwardSplit.taxable_value.toFixed(2)),
      cgst: Number(inwardSplit.cgst.toFixed(2)),
      sgst: Number(inwardSplit.sgst.toFixed(2)),
      igst: Number(inwardSplit.igst.toFixed(2))
    }
  ];

  const outputTax = rows[0].cgst + rows[0].sgst + rows[0].igst;
  const inputTax = rows[1].cgst + rows[1].sgst + rows[1].igst;

  return {
    key: "gstr-3b",
    title: "GSTR-3B",
    description: "Filing-ready outward tax, ITC, and net payable summary.",
    apiPath: "/api/v1/reports/gstr-3b",
    columns: [
      { key: "line_item", label: "Line item" },
      { key: "taxable_value", label: "Taxable Value", kind: "money" },
      { key: "cgst", label: "CGST", kind: "money" },
      { key: "sgst", label: "SGST", kind: "money" },
      { key: "igst", label: "IGST", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Output GST", value: outputTax, tone: "warn" },
      { label: "Eligible ITC", value: inputTax, tone: "good" },
      { label: "Net payable", value: outputTax - inputTax, tone: outputTax - inputTax > 0 ? "warn" : "good" }
    ]
  };
}

type JournalEntryLite = {
  id: string;
  entry_date: string;
  source_type: string | null;
};

type JournalLineLite = {
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
};

async function fetchPostedJournalRows(context: ApiContext, from: string, to: string) {
  const { data: entries, error: entryError } = await context.supabase
    .from("journal_entries")
    .select("id, entry_date, source_type")
    .eq("org_id", context.orgId)
    .eq("status", "posted")
    .gte("entry_date", from)
    .lte("entry_date", to);

  if (entryError) {
    throw new Error(entryError.message);
  }

  const typedEntries = (entries ?? []) as unknown as JournalEntryLite[];
  if (!typedEntries.length) {
    return { entries: [] as JournalEntryLite[], lines: [] as JournalLineLite[], accounts: [] as Array<{ id: string; code: string; name: string; account_type: string }> };
  }

  const entryIds = typedEntries.map((entry) => entry.id);
  const { data: lines, error: lineError } = await context.supabase
    .from("journal_entry_lines")
    .select("journal_entry_id, account_id, debit, credit")
    .eq("org_id", context.orgId)
    .in("journal_entry_id", entryIds);

  if (lineError) {
    throw new Error(lineError.message);
  }

  const accountIds = [...new Set((lines ?? []).map((line) => String(line.account_id)))];
  const { data: accounts, error: accountError } = await context.supabase
    .from("accounts")
    .select("id, code, name, account_type")
    .eq("org_id", context.orgId)
    .in("id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  return {
    entries: typedEntries,
    lines: (lines ?? []) as unknown as JournalLineLite[],
    accounts: (accounts ?? []) as Array<{ id: string; code: string; name: string; account_type: string }>
  };
}

async function fetchCashBalances(context: ApiContext, cutoff?: string | null) {
  const { data: cashAccounts, error: accountError } = await context.supabase
    .from("accounts")
    .select("id, code, name, account_type")
    .eq("org_id", context.orgId)
    .in("account_type", ["cash", "bank"]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  const accountIds = (cashAccounts ?? []).map((row) => String(row.id));
  if (!accountIds.length) {
    return { balances: new Map<string, number>(), accounts: [] as Array<{ id: string; code: string; name: string; account_type: string }> };
  }

  let entryQuery = context.supabase.from("journal_entries").select("id").eq("org_id", context.orgId).eq("status", "posted");
  if (cutoff) {
    entryQuery = entryQuery.lt("entry_date", cutoff);
  }

  const { data: entries, error: entryError } = await entryQuery;
  if (entryError) {
    throw new Error(entryError.message);
  }

  const entryIds = (entries ?? []).map((row) => String(row.id));
  if (!entryIds.length) {
    return { balances: new Map<string, number>(), accounts: (cashAccounts ?? []) as Array<{ id: string; code: string; name: string; account_type: string }> };
  }

  const { data: lines, error: lineError } = await context.supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit")
    .eq("org_id", context.orgId)
    .in("journal_entry_id", entryIds)
    .in("account_id", accountIds);

  if (lineError) {
    throw new Error(lineError.message);
  }

  const balances = new Map<string, number>();
  for (const line of lines ?? []) {
    const accountId = String(line.account_id);
    const delta = Number(line.debit ?? 0) - Number(line.credit ?? 0);
    balances.set(accountId, Number(((balances.get(accountId) ?? 0) + delta).toFixed(2)));
  }

  return { balances, accounts: (cashAccounts ?? []) as Array<{ id: string; code: string; name: string; account_type: string }> };
}

export async function buildTrialBalanceReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const { lines, accounts } = await fetchPostedJournalRows(context, from, to);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const rowsByAccount = new Map<string, { id: string; account: string; debit: number; credit: number }>();

  for (const line of lines) {
    const account = accountsById.get(String(line.account_id));
    if (!account) continue;
    const current = rowsByAccount.get(account.id) ?? {
      id: account.id,
      account: `${account.code} · ${account.name}`,
      debit: 0,
      credit: 0
    };
    current.debit += Number(line.debit ?? 0);
    current.credit += Number(line.credit ?? 0);
    rowsByAccount.set(account.id, current);
  }

  const rows = Array.from(rowsByAccount.values())
    .map((row) => ({ ...row, debit: Number(row.debit.toFixed(2)), credit: Number(row.credit.toFixed(2)) }))
    .sort((a, b) => a.account.localeCompare(b.account));

  const totalDebits = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredits = rows.reduce((sum, row) => sum + row.credit, 0);

  return {
    key: "trial-balance",
    title: "Trial Balance",
    description: "Debit and credit totals by account for the selected period.",
    apiPath: "/api/v1/reports/trial-balance",
    columns: [
      { key: "account", label: "Account" },
      { key: "debit", label: "Debit", kind: "money" },
      { key: "credit", label: "Credit", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Debits", value: Number(totalDebits.toFixed(2)), tone: "neutral" },
      { label: "Credits", value: Number(totalCredits.toFixed(2)), tone: "neutral" },
      { label: "Difference", value: Number((totalDebits - totalCredits).toFixed(2)), tone: Math.abs(totalDebits - totalCredits) < 0.01 ? "good" : "warn" }
    ]
  };
}

export async function buildProfitLossReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const { lines, accounts } = await fetchPostedJournalRows(context, from, to);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const relevantTypes = new Set(["revenue", "cost_of_goods_sold", "expense", "other_income", "other_expense"]);
  const rowsByAccount = new Map<string, { id: string; account: string; amount: number; account_type: string }>();

  for (const line of lines) {
    const account = accountsById.get(String(line.account_id));
    if (!account || !relevantTypes.has(account.account_type)) continue;
    const current = rowsByAccount.get(account.id) ?? {
      id: account.id,
      account: `${account.code} · ${account.name}`,
      amount: 0,
      account_type: account.account_type
    };
    current.amount += Number(line.credit ?? 0) - Number(line.debit ?? 0);
    rowsByAccount.set(account.id, current);
  }

  const rows = Array.from(rowsByAccount.values())
    .map((row) => ({
      id: row.id,
      account: row.account,
      current: Number(row.amount.toFixed(2)),
      comparison: 0,
      variance: Number(row.amount.toFixed(2))
    }))
    .sort((a, b) => a.account.localeCompare(b.account));

  const revenue = Array.from(rowsByAccount.values())
    .filter((row) => row.account_type === "revenue" || row.account_type === "other_income")
    .reduce((sum, row) => sum + row.amount, 0);
  const expenses = Array.from(rowsByAccount.values())
    .filter((row) => row.account_type !== "revenue" && row.account_type !== "other_income")
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const netIncome = revenue - expenses;

  return {
    key: "profit-loss",
    title: "Profit & Loss",
    description: "Revenue and expenses generated from posted journals for the selected period.",
    apiPath: "/api/v1/reports/profit-loss",
    columns: [
      { key: "account", label: "Account" },
      { key: "current", label: "Current", kind: "money" },
      { key: "comparison", label: "Comparison", kind: "money" },
      { key: "variance", label: "Variance", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Revenue", value: Number(revenue.toFixed(2)), tone: revenue >= 0 ? "good" : "warn" },
      { label: "Expenses", value: Number(expenses.toFixed(2)), tone: "warn" },
      { label: "Net income", value: Number(netIncome.toFixed(2)), tone: netIncome >= 0 ? "good" : "warn" }
    ]
  };
}

export async function buildBalanceSheetReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const { lines, accounts } = await fetchPostedJournalRows(context, "1900-01-01", to);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const assetTypes = new Set(["cash", "bank", "accounts_receivable", "other_current_asset", "fixed_asset", "other_asset"]);
  const liabilityTypes = new Set(["accounts_payable", "other_current_liability", "long_term_liability"]);
  const equityTypes = new Set(["equity", "retained_earnings"]);
  const rowsByAccount = new Map<string, { id: string; section: string; account: string; amount: number }>();

  for (const line of lines) {
    const account = accountsById.get(String(line.account_id));
    if (!account) continue;
    const isAsset = assetTypes.has(account.account_type);
    const isLiability = liabilityTypes.has(account.account_type);
    const isEquity = equityTypes.has(account.account_type);
    if (!isAsset && !isLiability && !isEquity) continue;

    const section = isAsset ? "Assets" : isLiability ? "Liabilities" : "Equity";
    const delta = isAsset ? Number(line.debit ?? 0) - Number(line.credit ?? 0) : Number(line.credit ?? 0) - Number(line.debit ?? 0);
    const current = rowsByAccount.get(account.id) ?? {
      id: account.id,
      section,
      account: `${account.code} · ${account.name}`,
      amount: 0
    };
    current.amount += delta;
    rowsByAccount.set(account.id, current);
  }

  const rows = Array.from(rowsByAccount.values())
    .map((row) => ({ ...row, amount: Number(row.amount.toFixed(2)) }))
    .sort((a, b) => (a.section === b.section ? a.account.localeCompare(b.account) : a.section.localeCompare(b.section)));

  const totalAssets = rows.filter((row) => row.section === "Assets").reduce((sum, row) => sum + row.amount, 0);
  const totalLiabilities = rows.filter((row) => row.section === "Liabilities").reduce((sum, row) => sum + row.amount, 0);
  const totalEquity = rows.filter((row) => row.section === "Equity").reduce((sum, row) => sum + row.amount, 0);

  return {
    key: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity from posted journals as of the report end date.",
    apiPath: "/api/v1/reports/balance-sheet",
    columns: [
      { key: "section", label: "Section" },
      { key: "account", label: "Account" },
      { key: "amount", label: "Amount", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Assets", value: Number(totalAssets.toFixed(2)), tone: "neutral" },
      { label: "Liabilities", value: Number(totalLiabilities.toFixed(2)), tone: "warn" },
      { label: "Equity", value: Number(totalEquity.toFixed(2)), tone: "good" }
    ]
  };
}

export async function buildCashFlowReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const { balances: openingBalances } = await fetchCashBalances(context, from);
  const { entries, lines, accounts } = await fetchPostedJournalRows(context, from, to);
  const cashAccountIds = new Set(accounts.filter((account) => account.account_type === "cash" || account.account_type === "bank").map((account) => account.id));
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));

  let cashInflows = 0;
  let cashOutflows = 0;
  for (const line of lines) {
    if (!cashAccountIds.has(String(line.account_id))) continue;
    cashInflows += Number(line.debit ?? 0);
    cashOutflows += Number(line.credit ?? 0);
  }

  const openingCash = Array.from(openingBalances.values()).reduce((sum, value) => sum + value, 0);
  const netCashFlow = cashInflows - cashOutflows;
  const closingCash = openingCash + netCashFlow;

  const paymentsReceived = lines
    .filter((line) => {
      if (!cashAccountIds.has(String(line.account_id))) return false;
      const entry = entryById.get(String(line.journal_entry_id));
      return entry?.source_type === "payment" && Number(line.debit ?? 0) > 0;
    })
    .reduce((sum, line) => sum + Number(line.debit ?? 0), 0);

  const paymentsMade = lines
    .filter((line) => {
      if (!cashAccountIds.has(String(line.account_id))) return false;
      const entry = entryById.get(String(line.journal_entry_id));
      return (entry?.source_type === "payment" || entry?.source_type === "expense") && Number(line.credit ?? 0) > 0;
    })
    .reduce((sum, line) => sum + Number(line.credit ?? 0), 0);

  return {
    key: "cash-flow",
    title: "Cash Flow",
    description: "Cash and bank movements based on posted journal entries for the selected period.",
    apiPath: "/api/v1/reports/cash-flow",
    columns: [
      { key: "activity", label: "Activity" },
      { key: "amount", label: "Amount", kind: "money" }
    ],
    rows: [
      { id: "cf-receipts", activity: "Cash receipts", amount: Number(paymentsReceived.toFixed(2)) },
      { id: "cf-payments", activity: "Cash payments", amount: Number((-paymentsMade).toFixed(2)) },
      { id: "cf-net", activity: "Net cash flow", amount: Number(netCashFlow.toFixed(2)) }
    ],
    summary: [
      { label: "Opening cash", value: Number(openingCash.toFixed(2)), tone: "neutral" },
      { label: "Net cash flow", value: Number(netCashFlow.toFixed(2)), tone: netCashFlow >= 0 ? "good" : "warn" },
      { label: "Closing cash", value: Number(closingCash.toFixed(2)), tone: closingCash >= 0 ? "good" : "warn" }
    ]
  };
}

export async function buildAgingReport(context: ApiContext, from: string, to: string): Promise<ReportConfig> {
  const contacts = await fetchContacts(context);
  const today = new Date().toISOString().slice(0, 10);
  const [invoices, bills] = await Promise.all([fetchInvoices(context), fetchBills(context)]);
  const buckets = new Map<string, { id: string; contact: string; current: number; days_30: number; days_60: number; days_90: number }>();

  const addBalance = (contactId: string, amount: number, dueDate: string) => {
    const key = contactId;
    const current = buckets.get(key) ?? {
      id: key,
      contact: contactName(contacts, contactId),
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0
    };

    if (dueDate >= today) {
      current.current += amount;
    } else {
      const daysLate = Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysLate <= 30) current.days_30 += amount;
      else if (daysLate <= 60) current.days_60 += amount;
      else current.days_90 += amount;
    }
    buckets.set(key, current);
  };

  invoices
    .filter((row) => matchesDateRange(row.issue_date, from, to) && Number(row.balance_due ?? 0) > 0 && row.status !== "void")
    .forEach((row) => addBalance(row.contact_id, Number(row.balance_due ?? 0), row.due_date));

  const rows = Array.from(buckets.values()).map((row) => ({
    ...row,
    current: Number(row.current.toFixed(2)),
    days_30: Number(row.days_30.toFixed(2)),
    days_60: Number(row.days_60.toFixed(2)),
    days_90: Number(row.days_90.toFixed(2))
  }));

  const overdue = rows.reduce((sum, row) => sum + row.days_30 + row.days_60 + row.days_90, 0);
  const total = rows.reduce((sum, row) => sum + row.current + row.days_30 + row.days_60 + row.days_90, 0);

  return {
    key: "aging",
    title: "Aging",
    description: "Receivable aging by customer for the selected period.",
    apiPath: "/api/v1/reports/aging",
    columns: [
      { key: "contact", label: "Contact" },
      { key: "current", label: "Current", kind: "money" },
      { key: "days_30", label: "1-30", kind: "money" },
      { key: "days_60", label: "31-60", kind: "money" },
      { key: "days_90", label: "90+", kind: "money" }
    ],
    rows,
    summary: [
      { label: "Current", value: Number(rows.reduce((sum, row) => sum + row.current, 0).toFixed(2)), tone: "neutral" },
      { label: "Overdue", value: Number(overdue.toFixed(2)), tone: overdue > 0 ? "warn" : "good" },
      { label: "Collection risk", value: total > 0 ? Number(((overdue / total) * 100).toFixed(2)) : 0, tone: overdue > 0 ? "warn" : "good", kind: "percent" }
    ]
  };
}
