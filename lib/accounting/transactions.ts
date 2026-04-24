import type { ApiContext } from "@/lib/api/auth";

type LineInput = {
  item_id?: string | null;
  account_id?: string | null;
  description: string;
  quantity: number;
  rate: number;
  discount?: number;
  tax_rate_id?: string | null;
  gst_rate?: number;
};

type TaxRateRow = {
  id: string;
  rate: number;
};

type AccountLookup = Record<string, { id: string; code: string; name: string; account_type: string }>;

type DocumentComputation = {
  subtotal: number;
  discount_total: number;
  taxable_total: number;
  tax_total: number;
  total: number;
  balance_due: number;
  same_state: boolean;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  lines: Array<{
    item_id: string | null;
    account_id: string | null;
    description: string;
    quantity: number;
    rate: number;
    discount: number;
    tax_rate_id: string | null;
    tax_amount: number;
    line_total: number;
    taxable_amount: number;
  }>;
};

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

function normalizeStateCode(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function getOrganization(context: ApiContext) {
  const { data, error } = await context.supabase
    .from("organizations")
    .select("id, state_code, base_currency, invoice_prefix, invoice_next_number")
    .eq("id", context.orgId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Organization not found.");
  }

  return data as {
    id: string;
    state_code: string | null;
    base_currency: string;
    invoice_prefix: string;
    invoice_next_number: number;
  };
}

async function getContactStateCode(context: ApiContext, contactId: string | null | undefined) {
  if (!contactId) return null;
  const { data } = await context.supabase.from("contacts").select("state_code").eq("org_id", context.orgId).eq("id", contactId).maybeSingle();
  return normalizeStateCode(data?.state_code);
}

async function getTaxRates(context: ApiContext, ids: string[]) {
  if (ids.length === 0) return new Map<string, TaxRateRow>();
  const { data, error } = await context.supabase.from("tax_rates").select("id, rate").eq("org_id", context.orgId).in("id", ids);
  if (error) {
    throw new Error(error.message);
  }
  return new Map((data ?? []).map((row) => [String(row.id), { id: String(row.id), rate: Number(row.rate ?? 0) }]));
}

async function getSystemAccounts(context: ApiContext): Promise<AccountLookup> {
  const { data, error } = await context.supabase
    .from("accounts")
    .select("id, code, name, account_type")
    .eq("org_id", context.orgId)
    .in("code", ["1000", "1010", "1200", "2000", "2200", "2210", "4000", "4100", "5000", "6000"]);

  if (error) {
    throw new Error(error.message);
  }

  return Object.fromEntries((data ?? []).map((row) => [String(row.code), { id: String(row.id), code: String(row.code), name: String(row.name), account_type: String(row.account_type) }]));
}

async function resolveBankLedgerAccountId(context: ApiContext, bankAccountId?: string | null, method?: string | null) {
  if (bankAccountId) {
    const { data } = await context.supabase.from("bank_accounts").select("account_id").eq("org_id", context.orgId).eq("id", bankAccountId).maybeSingle();
    if (typeof data?.account_id === "string") return data.account_id;
  }

  const systemAccounts = await getSystemAccounts(context);
  if (typeof method === "string" && method.toLowerCase().includes("cash")) {
    return systemAccounts["1010"]?.id ?? null;
  }
  return systemAccounts["1000"]?.id ?? systemAccounts["1010"]?.id ?? null;
}

export async function computeDocumentTotals(context: ApiContext, args: {
  contactId: string;
  placeOfSupply?: string | null;
  subtotal?: number;
  taxTotal?: number;
  total?: number;
  lineItems?: LineInput[];
}) {
  const organization = await getOrganization(context);
  const orgState = normalizeStateCode(organization.state_code);
  const placeOfSupply = normalizeStateCode(args.placeOfSupply) ?? (await getContactStateCode(context, args.contactId)) ?? orgState;
  const sameState = !orgState || !placeOfSupply ? true : orgState === placeOfSupply;

  const lineItems = args.lineItems?.length
    ? args.lineItems
    : [
        {
          description: "Document line",
          quantity: 1,
          rate: Number(args.subtotal ?? 0),
          discount: 0,
          gst_rate: Number(args.taxTotal ?? 0) > 0 && Number(args.subtotal ?? 0) > 0 ? (Number(args.taxTotal ?? 0) / Number(args.subtotal ?? 0)) * 100 : 0
        }
      ];

  const taxRateMap = await getTaxRates(
    context,
    lineItems.map((line) => line.tax_rate_id).filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;

  const lines = lineItems.map((line) => {
    const base = Number(line.quantity ?? 0) * Number(line.rate ?? 0);
    const discount = Number(line.discount ?? 0);
    const taxableAmount = Math.max(0, toMoney(base - discount));
    const gstRate = typeof line.gst_rate === "number" ? line.gst_rate : line.tax_rate_id ? Number(taxRateMap.get(line.tax_rate_id)?.rate ?? 0) : 0;
    const taxAmount = toMoney((taxableAmount * gstRate) / 100);
    const lineTotal = toMoney(taxableAmount + taxAmount);
    subtotal += toMoney(base);
    discountTotal += toMoney(discount);
    taxableTotal += taxableAmount;
    taxTotal += taxAmount;

    return {
      item_id: line.item_id ?? null,
      account_id: line.account_id ?? null,
      description: line.description,
      quantity: Number(line.quantity ?? 0),
      rate: Number(line.rate ?? 0),
      discount,
      tax_rate_id: line.tax_rate_id ?? null,
      tax_amount: taxAmount,
      line_total: lineTotal,
      taxable_amount: taxableAmount
    };
  });

  const total = toMoney(args.total ?? taxableTotal + taxTotal);
  const cgstAmount = sameState ? toMoney(taxTotal / 2) : 0;
  const sgstAmount = sameState ? toMoney(taxTotal / 2) : 0;
  const igstAmount = sameState ? 0 : taxTotal;

  const computation: DocumentComputation = {
    subtotal: toMoney(subtotal),
    discount_total: toMoney(discountTotal),
    taxable_total: toMoney(taxableTotal),
    tax_total: toMoney(taxTotal),
    total,
    balance_due: total,
    same_state: sameState,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: toMoney(igstAmount),
    lines
  };

  return { organization, placeOfSupply, computation };
}

async function nextSequenceNumber(context: ApiContext, prefix: string) {
  const organization = await getOrganization(context);
  const next = Number(organization.invoice_next_number ?? 1);
  const number = `${prefix}-${String(next).padStart(4, "0")}`;
  const { error } = await context.supabase.from("organizations").update({ invoice_next_number: next + 1 }).eq("id", context.orgId);
  if (error) {
    throw new Error(error.message);
  }
  return number;
}

async function insertJournal(context: ApiContext, args: {
  entry_date: string;
  memo: string;
  source_type: string;
  source_id: string;
  lines: Array<{ account_id: string; debit: number; credit: number; description?: string }>;
}) {
  const { count, error: countError } = await context.supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("org_id", context.orgId);
  if (countError) {
    throw new Error(countError.message);
  }

  const totalDebits = toMoney(args.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
  const totalCredits = toMoney(args.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
  if (totalDebits !== totalCredits) {
    throw new Error("Journal entry is not balanced.");
  }

  const entryNumber = `JE-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: journal, error: journalError } = await context.supabase
    .from("journal_entries")
    .insert({
      org_id: context.orgId,
      entry_number: entryNumber,
      entry_date: args.entry_date,
      status: "posted",
      memo: args.memo,
      source_type: args.source_type,
      source_id: args.source_id,
      created_by: context.userId,
      posted_by: context.userId,
      posted_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (journalError || !journal) {
    throw new Error(journalError?.message ?? "Journal entry could not be created.");
  }

  const lineRows = args.lines
    .filter((line) => line.debit > 0 || line.credit > 0)
    .map((line, index) => ({
      org_id: context.orgId,
      journal_entry_id: journal.id,
      account_id: line.account_id,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      description: line.description ?? null,
      display_order: index + 1
    }));

  const { error: linesError } = await context.supabase.from("journal_entry_lines").insert(lineRows);
  if (linesError) {
    throw new Error(linesError.message);
  }

  return journal.id as string;
}

async function upsertAccountBalancesFromJournal(context: ApiContext, journalEntryId: string) {
  const { data: lines, error } = await context.supabase.from("journal_entry_lines").select("account_id, debit, credit").eq("org_id", context.orgId).eq("journal_entry_id", journalEntryId);
  if (error) {
    throw new Error(error.message);
  }

  const netByAccount = new Map<string, number>();
  for (const line of lines ?? []) {
    const accountId = String(line.account_id);
    const net = Number(line.debit ?? 0) - Number(line.credit ?? 0);
    netByAccount.set(accountId, toMoney((netByAccount.get(accountId) ?? 0) + net));
  }

  for (const [accountId, delta] of netByAccount.entries()) {
    const { data: account } = await context.supabase.from("accounts").select("balance").eq("org_id", context.orgId).eq("id", accountId).single();
    const current = Number(account?.balance ?? 0);
    await context.supabase.from("accounts").update({ balance: toMoney(current + delta) }).eq("org_id", context.orgId).eq("id", accountId);
  }
}

async function persistInvoiceLines(context: ApiContext, invoiceId: string, lines: DocumentComputation["lines"]) {
  await context.supabase.from("invoice_lines").delete().eq("org_id", context.orgId).eq("invoice_id", invoiceId);
  if (!lines.length) return;
  const rows = lines.map((line, index) => ({
    org_id: context.orgId,
    invoice_id: invoiceId,
    item_id: line.item_id,
    account_id: line.account_id,
    description: line.description,
    quantity: line.quantity,
    rate: line.rate,
    discount: line.discount,
    tax_rate_id: line.tax_rate_id,
    tax_amount: line.tax_amount,
    line_total: line.line_total,
    display_order: index + 1
  }));
  const { error } = await context.supabase.from("invoice_lines").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

async function persistBillLines(context: ApiContext, billId: string, lines: DocumentComputation["lines"]) {
  await context.supabase.from("bill_lines").delete().eq("org_id", context.orgId).eq("bill_id", billId);
  if (!lines.length) return;
  const rows = lines.map((line, index) => ({
    org_id: context.orgId,
    bill_id: billId,
    item_id: line.item_id,
    account_id: line.account_id,
    description: line.description,
    quantity: line.quantity,
    rate: line.rate,
    discount: line.discount,
    tax_rate_id: line.tax_rate_id,
    tax_amount: line.tax_amount,
    line_total: line.line_total,
    display_order: index + 1
  }));
  const { error } = await context.supabase.from("bill_lines").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

function deriveInvoiceStatus(total: number, balanceDue: number, dueDate: string, currentStatus?: string) {
  if (currentStatus === "draft") return "draft";
  if (balanceDue <= 0) return "paid";
  if (balanceDue < total) return "partial";
  if (dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return "sent";
}

function deriveBillStatus(total: number, balanceDue: number, currentStatus?: string) {
  if (currentStatus === "draft") return "draft";
  if (balanceDue <= 0) return "paid";
  if (balanceDue < total) return "partial";
  return "approved";
}

export async function recalculateInvoiceStatus(context: ApiContext, invoiceId: string) {
  const { data: invoice, error } = await context.supabase.from("invoices").select("id, total, due_date, status").eq("org_id", context.orgId).eq("id", invoiceId).single();
  if (error || !invoice) throw new Error(error?.message ?? "Invoice not found.");
  const { data: allocations } = await context.supabase.from("payment_allocations").select("amount, payment_id, invoice_id").eq("org_id", context.orgId).eq("invoice_id", invoiceId);
  const paidAmount = (allocations ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const balanceDue = toMoney(Math.max(0, Number(invoice.total ?? 0) - paidAmount));
  const status = deriveInvoiceStatus(Number(invoice.total ?? 0), balanceDue, String(invoice.due_date), String(invoice.status));
  await context.supabase.from("invoices").update({ balance_due: balanceDue, status }).eq("org_id", context.orgId).eq("id", invoiceId);
  return { balanceDue, status };
}

export async function recalculateBillStatus(context: ApiContext, billId: string) {
  const { data: bill, error } = await context.supabase.from("bills").select("id, total, status").eq("org_id", context.orgId).eq("id", billId).single();
  if (error || !bill) throw new Error(error?.message ?? "Bill not found.");
  const { data: allocations } = await context.supabase.from("payment_allocations").select("amount, payment_id, bill_id").eq("org_id", context.orgId).eq("bill_id", billId);
  const paidAmount = (allocations ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const balanceDue = toMoney(Math.max(0, Number(bill.total ?? 0) - paidAmount));
  const status = deriveBillStatus(Number(bill.total ?? 0), balanceDue, String(bill.status));
  await context.supabase.from("bills").update({ balance_due: balanceDue, status }).eq("org_id", context.orgId).eq("id", billId);
  return { balanceDue, status };
}

export async function createInvoiceTransaction(context: ApiContext, input: Record<string, unknown>) {
  const lineItems = (Array.isArray(input.line_items) ? input.line_items : []) as LineInput[];
  const invoiceNumber = typeof input.invoice_number === "string" && input.invoice_number.trim() ? input.invoice_number : await nextSequenceNumber(context, typeof input.invoice_prefix === "string" ? input.invoice_prefix : "INV");
  const { placeOfSupply, computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    placeOfSupply: typeof input.place_of_supply === "string" ? input.place_of_supply : null,
    subtotal: Number(input.subtotal ?? 0),
    taxTotal: Number(input.tax_total ?? 0),
    total: Number(input.total ?? 0),
    lineItems
  });

  const status = deriveInvoiceStatus(computation.total, computation.balance_due, String(input.due_date), typeof input.status === "string" ? input.status : undefined);

  const { data: invoice, error } = await context.supabase
    .from("invoices")
    .insert({
      org_id: context.orgId,
      contact_id: String(input.contact_id),
      invoice_number: invoiceNumber,
      status,
      issue_date: String(input.issue_date),
      due_date: String(input.due_date),
      currency: String(input.currency ?? "INR"),
      exchange_rate: Number(input.exchange_rate ?? 1),
      subtotal: computation.subtotal,
      discount_total: computation.discount_total,
      tax_total: computation.tax_total,
      total: computation.total,
      balance_due: computation.balance_due,
      notes: typeof input.notes === "string" ? input.notes : null,
      place_of_supply: placeOfSupply,
      round_off: Number(input.round_off ?? 0),
      terms: typeof input.terms === "string" ? input.terms : null,
      template_type: typeof input.template_type === "string" ? input.template_type : "classic",
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !invoice) {
    throw new Error(error?.message ?? "Invoice could not be created.");
  }

  await persistInvoiceLines(context, String(invoice.id), computation.lines);
  return { invoice, computation };
}

export async function postInvoiceJournal(context: ApiContext, invoiceId: string) {
  const { data: invoice, error } = await context.supabase
    .from("invoices")
    .select("id, invoice_number, issue_date, subtotal, discount_total, tax_total, total, journal_entry_id")
    .eq("org_id", context.orgId)
    .eq("id", invoiceId)
    .single();
  if (error || !invoice) throw new Error(error?.message ?? "Invoice not found.");
  if (invoice.journal_entry_id) return String(invoice.journal_entry_id);

  const systemAccounts = await getSystemAccounts(context);
  const revenueAccountId = systemAccounts["4000"]?.id ?? systemAccounts["4100"]?.id;
  const receivableAccountId = systemAccounts["1200"]?.id;
  const taxPayableAccountId = systemAccounts["2200"]?.id;
  if (!revenueAccountId || !receivableAccountId || !taxPayableAccountId) {
    throw new Error("Required system accounts are missing.");
  }

  const taxableAmount = toMoney(Number(invoice.subtotal ?? 0) - Number(invoice.discount_total ?? 0));
  const journalEntryId = await insertJournal(context, {
    entry_date: String(invoice.issue_date),
    memo: `Invoice ${invoice.invoice_number}`,
    source_type: "invoice",
    source_id: String(invoice.id),
    lines: [
      { account_id: receivableAccountId, debit: Number(invoice.total ?? 0), credit: 0, description: `Invoice ${invoice.invoice_number}` },
      { account_id: revenueAccountId, debit: 0, credit: taxableAmount, description: `Revenue ${invoice.invoice_number}` },
      { account_id: taxPayableAccountId, debit: 0, credit: Number(invoice.tax_total ?? 0), description: `GST output ${invoice.invoice_number}` }
    ]
  });
  await upsertAccountBalancesFromJournal(context, journalEntryId);
  await context.supabase.from("invoices").update({ journal_entry_id: journalEntryId }).eq("org_id", context.orgId).eq("id", invoiceId);
  return journalEntryId;
}

export async function createBillTransaction(context: ApiContext, input: Record<string, unknown>) {
  const lineItems = (Array.isArray(input.line_items) ? input.line_items : []) as LineInput[];
  const billNumber = typeof input.bill_number === "string" && input.bill_number.trim() ? input.bill_number : `BILL-${Date.now().toString().slice(-6)}`;
  const { placeOfSupply, computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    placeOfSupply: typeof input.place_of_supply === "string" ? input.place_of_supply : null,
    subtotal: Number(input.subtotal ?? 0),
    taxTotal: Number(input.tax_total ?? 0),
    total: Number(input.total ?? 0),
    lineItems
  });

  const status = deriveBillStatus(computation.total, computation.balance_due, typeof input.status === "string" ? input.status : undefined);

  const { data: bill, error } = await context.supabase
    .from("bills")
    .insert({
      org_id: context.orgId,
      contact_id: String(input.contact_id),
      bill_number: billNumber,
      status,
      issue_date: String(input.issue_date),
      due_date: String(input.due_date),
      currency: String(input.currency ?? "INR"),
      exchange_rate: Number(input.exchange_rate ?? 1),
      subtotal: computation.subtotal,
      discount_total: computation.discount_total,
      tax_total: computation.tax_total,
      total: computation.total,
      balance_due: computation.balance_due,
      notes: typeof input.notes === "string" ? input.notes : null,
      place_of_supply: placeOfSupply,
      tds_amount: Number(input.tds_amount ?? 0)
    })
    .select("*")
    .single();

  if (error || !bill) {
    throw new Error(error?.message ?? "Bill could not be created.");
  }

  await persistBillLines(context, String(bill.id), computation.lines);
  return { bill, computation };
}

export async function postBillJournal(context: ApiContext, billId: string) {
  const { data: bill, error } = await context.supabase
    .from("bills")
    .select("id, bill_number, issue_date, subtotal, discount_total, tax_total, total, journal_entry_id")
    .eq("org_id", context.orgId)
    .eq("id", billId)
    .single();
  if (error || !bill) throw new Error(error?.message ?? "Bill not found.");
  if (bill.journal_entry_id) return String(bill.journal_entry_id);

  const systemAccounts = await getSystemAccounts(context);
  const expenseAccountId = systemAccounts["6000"]?.id ?? systemAccounts["5000"]?.id;
  const payableAccountId = systemAccounts["2000"]?.id;
  const taxRecoverableAccountId = systemAccounts["2210"]?.id;
  if (!expenseAccountId || !payableAccountId || !taxRecoverableAccountId) {
    throw new Error("Required system accounts are missing.");
  }

  const taxableAmount = toMoney(Number(bill.subtotal ?? 0) - Number(bill.discount_total ?? 0));
  const journalEntryId = await insertJournal(context, {
    entry_date: String(bill.issue_date),
    memo: `Bill ${bill.bill_number}`,
    source_type: "bill",
    source_id: String(bill.id),
    lines: [
      { account_id: expenseAccountId, debit: taxableAmount, credit: 0, description: `Expense ${bill.bill_number}` },
      { account_id: taxRecoverableAccountId, debit: Number(bill.tax_total ?? 0), credit: 0, description: `GST input ${bill.bill_number}` },
      { account_id: payableAccountId, debit: 0, credit: Number(bill.total ?? 0), description: `Payable ${bill.bill_number}` }
    ]
  });
  await upsertAccountBalancesFromJournal(context, journalEntryId);
  await context.supabase.from("bills").update({ journal_entry_id: journalEntryId }).eq("org_id", context.orgId).eq("id", billId);
  return journalEntryId;
}

export async function createPaymentTransaction(context: ApiContext, input: {
  contact_id?: string | null;
  payment_type: "received" | "made";
  payment_date: string;
  amount: number;
  currency?: string;
  exchange_rate?: number;
  method: string;
  reference?: string | null;
  memo?: string | null;
  status?: string;
  invoice_id?: string | null;
  bill_id?: string | null;
  bank_account_id?: string | null;
}) {
  const ledgerAccountId = await resolveBankLedgerAccountId(context, input.bank_account_id, input.method);
  if (!ledgerAccountId) {
    throw new Error("A bank or cash account is required before recording payments.");
  }

  const status = input.status ?? "posted";

  const { data: payment, error } = await context.supabase
    .from("payments")
    .insert({
      org_id: context.orgId,
      contact_id: input.contact_id ?? null,
      payment_type: input.payment_type,
      payment_date: input.payment_date,
      amount: input.amount,
      unapplied_amount: input.amount,
      currency: input.currency ?? "INR",
      exchange_rate: input.exchange_rate ?? 1,
      method: input.method,
      reference: input.reference ?? null,
      deposit_account_id: ledgerAccountId,
      status,
      memo: input.memo ?? null
    })
    .select("*")
    .single();

  if (error || !payment) {
    throw new Error(error?.message ?? "Payment could not be created.");
  }

  const systemAccounts = await getSystemAccounts(context);
  const receivableAccountId = systemAccounts["1200"]?.id;
  const payableAccountId = systemAccounts["2000"]?.id;
  if (!receivableAccountId || !payableAccountId) {
    throw new Error("Required receivable/payable accounts are missing.");
  }

  if (status !== "posted") {
    return payment;
  }

  let allocationAmount = 0;
  if (input.invoice_id) {
    const status = await recalculateInvoiceStatus(context, input.invoice_id).catch(() => null);
    const { data: invoice } = await context.supabase.from("invoices").select("balance_due, total").eq("org_id", context.orgId).eq("id", input.invoice_id).single();
    allocationAmount = Math.min(input.amount, Number(invoice?.balance_due ?? input.amount));
    await context.supabase.from("payment_allocations").insert({
      org_id: context.orgId,
      payment_id: payment.id,
      invoice_id: input.invoice_id,
      amount: allocationAmount
    });
    await context.supabase.from("payments").update({ unapplied_amount: toMoney(input.amount - allocationAmount) }).eq("org_id", context.orgId).eq("id", payment.id);
    await recalculateInvoiceStatus(context, input.invoice_id);
    void status;
  } else if (input.bill_id) {
    const { data: bill } = await context.supabase.from("bills").select("balance_due, total").eq("org_id", context.orgId).eq("id", input.bill_id).single();
    allocationAmount = Math.min(input.amount, Number(bill?.balance_due ?? input.amount));
    await context.supabase.from("payment_allocations").insert({
      org_id: context.orgId,
      payment_id: payment.id,
      bill_id: input.bill_id,
      amount: allocationAmount
    });
    await context.supabase.from("payments").update({ unapplied_amount: toMoney(input.amount - allocationAmount) }).eq("org_id", context.orgId).eq("id", payment.id);
    await recalculateBillStatus(context, input.bill_id);
  }

  const journalEntryId = await insertJournal(context, {
    entry_date: input.payment_date,
    memo: input.memo ?? `${input.payment_type === "received" ? "Customer" : "Vendor"} payment`,
    source_type: "payment",
    source_id: String(payment.id),
    lines:
      input.payment_type === "received"
        ? [
            { account_id: ledgerAccountId, debit: input.amount, credit: 0, description: "Bank receipt" },
            { account_id: receivableAccountId, debit: 0, credit: input.amount, description: "Receivable settlement" }
          ]
        : [
            { account_id: payableAccountId, debit: input.amount, credit: 0, description: "Payable settlement" },
            { account_id: ledgerAccountId, debit: 0, credit: input.amount, description: "Bank payment" }
          ]
  });

  await upsertAccountBalancesFromJournal(context, journalEntryId);
  await context.supabase.from("payments").update({ journal_entry_id: journalEntryId }).eq("org_id", context.orgId).eq("id", payment.id);

  if (input.bank_account_id) {
    const { data: bankAccount } = await context.supabase.from("bank_accounts").select("current_balance").eq("org_id", context.orgId).eq("id", input.bank_account_id).single();
    const current = Number(bankAccount?.current_balance ?? 0);
    const delta = input.payment_type === "received" ? input.amount : -input.amount;
    await context.supabase.from("bank_accounts").update({ current_balance: toMoney(current + delta) }).eq("org_id", context.orgId).eq("id", input.bank_account_id);
  }

  return payment;
}

export async function createExpenseTransaction(context: ApiContext, input: {
  expense_date: string;
  vendor_id?: string | null;
  account_id: string;
  payment_account_id?: string | null;
  bank_account_id?: string | null;
  project_id?: string | null;
  amount: number;
  tax_amount?: number;
  currency?: string;
  receipt_url?: string | null;
  is_billable?: boolean;
  description: string;
  status?: string;
}) {
  const status = input.status ?? "posted";
  const taxAmount = toMoney(Number(input.tax_amount ?? 0));
  const amount = toMoney(Number(input.amount ?? 0));

  const paymentAccountId =
    input.payment_account_id ??
    (await resolveBankLedgerAccountId(context, input.bank_account_id ?? null, "bank"));

  const { data: expense, error } = await context.supabase
    .from("expenses")
    .insert({
      org_id: context.orgId,
      expense_date: input.expense_date,
      vendor_id: input.vendor_id ?? null,
      account_id: input.account_id,
      payment_account_id: paymentAccountId,
      project_id: input.project_id ?? null,
      amount,
      tax_amount: taxAmount,
      currency: input.currency ?? "INR",
      receipt_url: input.receipt_url ?? null,
      is_billable: input.is_billable ?? false,
      description: input.description,
      status
    })
    .select("*")
    .single();

  if (error || !expense) {
    throw new Error(error?.message ?? "Expense could not be created.");
  }

  if (status !== "posted") {
    return expense;
  }

  const systemAccounts = await getSystemAccounts(context);
  const taxRecoverableAccountId = systemAccounts["2210"]?.id;
  if (!paymentAccountId || !taxRecoverableAccountId) {
    throw new Error("Required payment or tax accounts are missing.");
  }

  const journalEntryId = await insertJournal(context, {
    entry_date: input.expense_date,
    memo: input.description,
    source_type: "expense",
    source_id: String(expense.id),
    lines: [
      { account_id: input.account_id, debit: amount, credit: 0, description: input.description },
      { account_id: taxRecoverableAccountId, debit: taxAmount, credit: 0, description: "Expense tax input" },
      { account_id: paymentAccountId, debit: 0, credit: toMoney(amount + taxAmount), description: "Expense payment" }
    ]
  });

  await upsertAccountBalancesFromJournal(context, journalEntryId);
  await context.supabase.from("expenses").update({ journal_entry_id: journalEntryId }).eq("org_id", context.orgId).eq("id", expense.id);

  if (input.bank_account_id) {
    const { data: bankAccount } = await context.supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("org_id", context.orgId)
      .eq("id", input.bank_account_id)
      .single();
    const current = Number(bankAccount?.current_balance ?? 0);
    await context.supabase
      .from("bank_accounts")
      .update({ current_balance: toMoney(current - amount - taxAmount) })
      .eq("org_id", context.orgId)
      .eq("id", input.bank_account_id);
  }

  return { ...expense, journal_entry_id: journalEntryId };
}
