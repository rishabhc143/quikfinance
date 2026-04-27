import { computeDocumentTotals } from "@/lib/accounting/transactions";
import type { ApiContext } from "@/lib/api/auth";

type QuotationInput = {
  contact_id: string;
  quotation_number?: string;
  issue_date: string;
  due_date?: string;
  status?: "draft" | "sent" | "accepted" | "expired";
  currency?: string;
  subtotal?: number;
  discount_total?: number;
  tax_total?: number;
  total?: number;
  place_of_supply?: string | null;
  template_type?: "classic" | "modern" | "minimal";
  terms?: string | null;
  notes?: string | null;
  line_items?: Array<{
    item_id?: string | null;
    account_id?: string | null;
    description: string;
    quantity: number;
    rate: number;
    discount?: number;
    tax_rate_id?: string | null;
    gst_rate?: number;
  }>;
};

function nextQuotationNumber() {
  return `QT-${Date.now().toString().slice(-6)}`;
}

const META_PREFIX = "[[QF_QUOTATION_META]]";

function isMissingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("column") || message.includes("relation") || message.includes("schema cache");
}

function buildFallbackNotes(
  notes: string | null | undefined,
  meta: {
    line_items: QuotationInput["line_items"];
    place_of_supply?: string | null;
    template_type?: string;
    terms?: string | null;
  }
) {
  const plainNotes = typeof notes === "string" ? notes.trim() : "";
  return `${META_PREFIX}${JSON.stringify(meta)}\n\n${plainNotes}`.trim();
}

export function parseQuotationFallbackNotes(notes: string | null | undefined) {
  const text = typeof notes === "string" ? notes : "";
  if (!text.startsWith(META_PREFIX)) {
    return { notes: text || null, meta: null as null | { line_items?: QuotationInput["line_items"]; place_of_supply?: string | null; template_type?: string; terms?: string | null } };
  }

  const separator = text.indexOf("\n\n");
  const metaChunk = separator >= 0 ? text.slice(META_PREFIX.length, separator).trim() : text.slice(META_PREFIX.length).trim();
  const notesChunk = separator >= 0 ? text.slice(separator + 2).trim() : "";

  try {
    const parsed = JSON.parse(metaChunk) as { line_items?: QuotationInput["line_items"]; place_of_supply?: string | null; template_type?: string; terms?: string | null };
    return {
      notes: notesChunk || null,
      meta: parsed
    };
  } catch {
    return { notes: text || null, meta: null };
  }
}

export async function persistQuotationLines(
  context: ApiContext,
  quotationId: string,
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
  }>
) {
  if (!lines.length) return;

  const rows = lines.map((line, index) => ({
    org_id: context.orgId,
    quotation_id: quotationId,
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

  const { error } = await context.supabase.from("quotation_lines").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

export async function createQuotationDocument(context: ApiContext, input: QuotationInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const quotationNumber = typeof input.quotation_number === "string" && input.quotation_number.trim()
    ? input.quotation_number.trim()
    : nextQuotationNumber();

  const { placeOfSupply, computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    placeOfSupply: input.place_of_supply,
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const baseInsert = {
    org_id: context.orgId,
    contact_id: input.contact_id,
    quotation_number: quotationNumber,
    issue_date: input.issue_date,
    due_date: input.due_date ?? input.issue_date,
    status: input.status ?? "draft",
    currency: input.currency ?? "INR",
    subtotal: computation.subtotal,
    tax_total: computation.tax_total,
    total: computation.total,
    notes: input.notes ?? null,
    created_by: context.userId
  };

  let insertPayload: Record<string, unknown> = {
    ...baseInsert,
    discount_total: computation.discount_total,
    place_of_supply: placeOfSupply,
    template_type: input.template_type ?? "classic",
    terms: input.terms ?? null
  };

  let insertResult = await context.supabase.from("quotations").insert(insertPayload).select("*").single();
  if (insertResult.error && isMissingSchemaError(insertResult.error)) {
    insertPayload = {
      ...baseInsert,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        place_of_supply: placeOfSupply,
        template_type: input.template_type ?? "classic",
        terms: input.terms ?? null
      })
    };
    insertResult = await context.supabase.from("quotations").insert(insertPayload).select("*").single();
  }

  const { data: quotation, error } = insertResult;

  if (error || !quotation) {
    throw new Error(error?.message ?? "Quotation could not be created.");
  }

  try {
    await persistQuotationLines(context, String(quotation.id), computation.lines);
  } catch (error) {
    if (!(error instanceof Error) || !isMissingSchemaError(error)) {
      throw error;
    }
    await context.supabase
      .from("quotations")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          place_of_supply: placeOfSupply,
          template_type: input.template_type ?? "classic",
          terms: input.terms ?? null
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", quotation.id);
  }

  return { quotation, computation };
}

export async function updateQuotationDocument(context: ApiContext, quotationId: string, input: QuotationInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];

  const { placeOfSupply, computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    placeOfSupply: input.place_of_supply,
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const baseUpdate = {
    contact_id: input.contact_id,
    quotation_number: input.quotation_number?.trim() || undefined,
    issue_date: input.issue_date,
    due_date: input.due_date ?? input.issue_date,
    status: input.status ?? "draft",
    currency: input.currency ?? "INR",
    subtotal: computation.subtotal,
    tax_total: computation.tax_total,
    total: computation.total,
    notes: input.notes ?? null
  };

  let updatePayload: Record<string, unknown> = {
    ...baseUpdate,
    discount_total: computation.discount_total,
    place_of_supply: placeOfSupply,
    template_type: input.template_type ?? "classic",
    terms: input.terms ?? null
  };

  let updateResult = await context.supabase
    .from("quotations")
    .update(updatePayload)
    .eq("org_id", context.orgId)
    .eq("id", quotationId)
    .select("*")
    .single();

  if (updateResult.error && isMissingSchemaError(updateResult.error)) {
    updatePayload = {
      ...baseUpdate,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        place_of_supply: placeOfSupply,
        template_type: input.template_type ?? "classic",
        terms: input.terms ?? null
      })
    };
    updateResult = await context.supabase
      .from("quotations")
      .update(updatePayload)
      .eq("org_id", context.orgId)
      .eq("id", quotationId)
      .select("*")
      .single();
  }

  const { data: updated, error } = updateResult;

  if (error || !updated) {
    throw new Error(error?.message ?? "Quotation could not be updated.");
  }

  const { error: deleteError } = await context.supabase
    .from("quotation_lines")
    .delete()
    .eq("org_id", context.orgId)
    .eq("quotation_id", quotationId);

  if (deleteError && !isMissingSchemaError(deleteError)) {
    throw new Error(deleteError.message);
  }

  try {
    await persistQuotationLines(context, quotationId, computation.lines);
  } catch (error) {
    if (!(error instanceof Error) || !isMissingSchemaError(error)) {
      throw error;
    }
    await context.supabase
      .from("quotations")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          place_of_supply: placeOfSupply,
          template_type: input.template_type ?? "classic",
          terms: input.terms ?? null
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", quotationId);
  }

  return { quotation: updated, computation };
}
