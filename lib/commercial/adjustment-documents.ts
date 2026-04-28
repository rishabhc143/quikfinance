import { computeDocumentTotals } from "@/lib/accounting/transactions";
import type { ApiContext } from "@/lib/api/auth";

type AdjustmentLine = {
  item_id?: string | null;
  account_id?: string | null;
  description: string;
  quantity: number;
  rate: number;
  discount?: number;
  tax_rate_id?: string | null;
  gst_rate?: number;
};

type CreditNoteInput = {
  contact_id: string;
  invoice_id?: string | null;
  credit_note_number?: string;
  issue_date: string;
  due_date?: string;
  status?: "draft" | "issued" | "applied" | "void";
  currency?: string;
  subtotal?: number;
  tax_total?: number;
  total?: number;
  notes?: string | null;
  line_items?: AdjustmentLine[];
};

type VendorCreditInput = {
  contact_id: string;
  bill_id?: string | null;
  vendor_credit_number?: string;
  issue_date: string;
  due_date?: string;
  status?: "draft" | "received" | "applied" | "void";
  currency?: string;
  subtotal?: number;
  tax_total?: number;
  total?: number;
  notes?: string | null;
  line_items?: AdjustmentLine[];
};

const CREDIT_PREFIX = "[[QF_CREDIT_NOTE_META]]";
const VENDOR_PREFIX = "[[QF_VENDOR_CREDIT_META]]";

function nextNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function buildFallbackNotes(prefix: string, notes: string | null | undefined, meta: { line_items?: AdjustmentLine[] }) {
  const plainNotes = typeof notes === "string" ? notes.trim() : "";
  return `${prefix}${JSON.stringify(meta)}\n\n${plainNotes}`.trim();
}

function parseFallbackNotes(prefix: string, notes: string | null | undefined) {
  const text = typeof notes === "string" ? notes : "";
  if (!text.startsWith(prefix)) {
    return { notes: text || null, meta: null as null | { line_items?: AdjustmentLine[] } };
  }

  const separator = text.indexOf("\n\n");
  const metaChunk = separator >= 0 ? text.slice(prefix.length, separator).trim() : text.slice(prefix.length).trim();
  const notesChunk = separator >= 0 ? text.slice(separator + 2).trim() : "";

  try {
    return {
      notes: notesChunk || null,
      meta: JSON.parse(metaChunk) as { line_items?: AdjustmentLine[] }
    };
  } catch {
    return { notes: text || null, meta: null };
  }
}

export function parseCreditNoteFallbackNotes(notes: string | null | undefined) {
  return parseFallbackNotes(CREDIT_PREFIX, notes);
}

export function parseVendorCreditFallbackNotes(notes: string | null | undefined) {
  return parseFallbackNotes(VENDOR_PREFIX, notes);
}

export async function createCreditNoteDocument(context: ApiContext, input: CreditNoteInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const creditNoteNumber = typeof input.credit_note_number === "string" && input.credit_note_number.trim() ? input.credit_note_number.trim() : nextNumber("CN");
  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const { data: creditNote, error } = await context.supabase
    .from("credit_notes")
    .insert({
      org_id: context.orgId,
      contact_id: input.contact_id,
      invoice_id: input.invoice_id ?? null,
      credit_note_number: creditNoteNumber,
      status: input.status ?? "draft",
      issue_date: input.issue_date,
      due_date: input.due_date ?? input.issue_date,
      currency: input.currency ?? "INR",
      subtotal: computation.subtotal,
      tax_total: computation.tax_total,
      total: computation.total,
      notes: buildFallbackNotes(CREDIT_PREFIX, input.notes, { line_items: lineItems }),
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !creditNote) {
    throw new Error(error?.message ?? "Credit note could not be created.");
  }

  return { creditNote, computation };
}

export async function updateCreditNoteDocument(context: ApiContext, creditNoteId: string, input: CreditNoteInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const { data: creditNote, error } = await context.supabase
    .from("credit_notes")
    .update({
      contact_id: input.contact_id,
      invoice_id: input.invoice_id ?? null,
      credit_note_number: input.credit_note_number?.trim() || undefined,
      status: input.status ?? "draft",
      issue_date: input.issue_date,
      due_date: input.due_date ?? input.issue_date,
      currency: input.currency ?? "INR",
      subtotal: computation.subtotal,
      tax_total: computation.tax_total,
      total: computation.total,
      notes: buildFallbackNotes(CREDIT_PREFIX, input.notes, { line_items: lineItems })
    })
    .eq("org_id", context.orgId)
    .eq("id", creditNoteId)
    .select("*")
    .single();

  if (error || !creditNote) {
    throw new Error(error?.message ?? "Credit note could not be updated.");
  }

  return { creditNote, computation };
}

export async function createVendorCreditDocument(context: ApiContext, input: VendorCreditInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const vendorCreditNumber =
    typeof input.vendor_credit_number === "string" && input.vendor_credit_number.trim() ? input.vendor_credit_number.trim() : nextNumber("VC");
  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const { data: vendorCredit, error } = await context.supabase
    .from("vendor_credits")
    .insert({
      org_id: context.orgId,
      contact_id: input.contact_id,
      bill_id: input.bill_id ?? null,
      vendor_credit_number: vendorCreditNumber,
      status: input.status ?? "draft",
      issue_date: input.issue_date,
      due_date: input.due_date ?? input.issue_date,
      currency: input.currency ?? "INR",
      subtotal: computation.subtotal,
      tax_total: computation.tax_total,
      total: computation.total,
      notes: buildFallbackNotes(VENDOR_PREFIX, input.notes, { line_items: lineItems }),
      created_by: context.userId
    })
    .select("*")
    .single();

  if (error || !vendorCredit) {
    throw new Error(error?.message ?? "Vendor credit could not be created.");
  }

  return { vendorCredit, computation };
}

export async function updateVendorCreditDocument(context: ApiContext, vendorCreditId: string, input: VendorCreditInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const { data: vendorCredit, error } = await context.supabase
    .from("vendor_credits")
    .update({
      contact_id: input.contact_id,
      bill_id: input.bill_id ?? null,
      vendor_credit_number: input.vendor_credit_number?.trim() || undefined,
      status: input.status ?? "draft",
      issue_date: input.issue_date,
      due_date: input.due_date ?? input.issue_date,
      currency: input.currency ?? "INR",
      subtotal: computation.subtotal,
      tax_total: computation.tax_total,
      total: computation.total,
      notes: buildFallbackNotes(VENDOR_PREFIX, input.notes, { line_items: lineItems })
    })
    .eq("org_id", context.orgId)
    .eq("id", vendorCreditId)
    .select("*")
    .single();

  if (error || !vendorCredit) {
    throw new Error(error?.message ?? "Vendor credit could not be updated.");
  }

  return { vendorCredit, computation };
}
