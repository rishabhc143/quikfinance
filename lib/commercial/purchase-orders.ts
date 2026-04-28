import { computeDocumentTotals } from "@/lib/accounting/transactions";
import type { ApiContext } from "@/lib/api/auth";

type PurchaseOrderInput = {
  contact_id: string;
  purchase_order_number?: string;
  issue_date: string;
  due_date?: string;
  status?: "draft" | "approved" | "received" | "cancelled";
  currency?: string;
  subtotal?: number;
  discount_total?: number;
  tax_total?: number;
  total?: number;
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

const META_PREFIX = "[[QF_PURCHASE_ORDER_META]]";

function nextPurchaseOrderNumber() {
  return `PO-${Date.now().toString().slice(-6)}`;
}

function isMissingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("column") || message.includes("relation") || message.includes("schema cache");
}

function buildFallbackNotes(
  notes: string | null | undefined,
  meta: {
    line_items: PurchaseOrderInput["line_items"];
    discount_total: number;
  }
) {
  const plainNotes = typeof notes === "string" ? notes.trim() : "";
  return `${META_PREFIX}${JSON.stringify(meta)}\n\n${plainNotes}`.trim();
}

export function parsePurchaseOrderFallbackNotes(notes: string | null | undefined) {
  const text = typeof notes === "string" ? notes : "";
  if (!text.startsWith(META_PREFIX)) {
    return {
      notes: text || null,
      meta: null as null | { line_items?: PurchaseOrderInput["line_items"]; discount_total?: number }
    };
  }

  const separator = text.indexOf("\n\n");
  const metaChunk = separator >= 0 ? text.slice(META_PREFIX.length, separator).trim() : text.slice(META_PREFIX.length).trim();
  const notesChunk = separator >= 0 ? text.slice(separator + 2).trim() : "";

  try {
    return {
      notes: notesChunk || null,
      meta: JSON.parse(metaChunk) as { line_items?: PurchaseOrderInput["line_items"]; discount_total?: number }
    };
  } catch {
    return { notes: text || null, meta: null };
  }
}

export async function persistPurchaseOrderLines(
  context: ApiContext,
  purchaseOrderId: string,
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
    purchase_order_id: purchaseOrderId,
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

  const { error } = await context.supabase.from("purchase_order_lines").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

export async function createPurchaseOrderDocument(context: ApiContext, input: PurchaseOrderInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const purchaseOrderNumber =
    typeof input.purchase_order_number === "string" && input.purchase_order_number.trim()
      ? input.purchase_order_number.trim()
      : nextPurchaseOrderNumber();

  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const baseInsert = {
    org_id: context.orgId,
    contact_id: input.contact_id,
    purchase_order_number: purchaseOrderNumber,
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
    discount_total: computation.discount_total
  };

  let insertResult = await context.supabase.from("purchase_orders").insert(insertPayload).select("*").single();
  if (insertResult.error && isMissingSchemaError(insertResult.error)) {
    insertPayload = {
      ...baseInsert,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        discount_total: computation.discount_total
      })
    };
    insertResult = await context.supabase.from("purchase_orders").insert(insertPayload).select("*").single();
  }

  const { data: purchaseOrder, error } = insertResult;
  if (error || !purchaseOrder) {
    throw new Error(error?.message ?? "Purchase order could not be created.");
  }

  try {
    await persistPurchaseOrderLines(context, String(purchaseOrder.id), computation.lines);
  } catch (persistError) {
    if (!(persistError instanceof Error) || !isMissingSchemaError(persistError)) {
      throw persistError;
    }
    await context.supabase
      .from("purchase_orders")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          discount_total: computation.discount_total
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", purchaseOrder.id);
  }

  return { purchaseOrder, computation };
}

export async function updatePurchaseOrderDocument(context: ApiContext, purchaseOrderId: string, input: PurchaseOrderInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];

  const { computation } = await computeDocumentTotals(context, {
    contactId: String(input.contact_id),
    subtotal: typeof input.subtotal === "number" ? input.subtotal : undefined,
    taxTotal: typeof input.tax_total === "number" ? input.tax_total : undefined,
    total: typeof input.total === "number" ? input.total : undefined,
    lineItems
  });

  const baseUpdate = {
    contact_id: input.contact_id,
    purchase_order_number: input.purchase_order_number?.trim() || undefined,
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
    discount_total: computation.discount_total
  };

  let updateResult = await context.supabase
    .from("purchase_orders")
    .update(updatePayload)
    .eq("org_id", context.orgId)
    .eq("id", purchaseOrderId)
    .select("*")
    .single();

  if (updateResult.error && isMissingSchemaError(updateResult.error)) {
    updatePayload = {
      ...baseUpdate,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        discount_total: computation.discount_total
      })
    };
    updateResult = await context.supabase
      .from("purchase_orders")
      .update(updatePayload)
      .eq("org_id", context.orgId)
      .eq("id", purchaseOrderId)
      .select("*")
      .single();
  }

  const { data: purchaseOrder, error } = updateResult;
  if (error || !purchaseOrder) {
    throw new Error(error?.message ?? "Purchase order could not be updated.");
  }

  const { error: deleteError } = await context.supabase
    .from("purchase_order_lines")
    .delete()
    .eq("org_id", context.orgId)
    .eq("purchase_order_id", purchaseOrderId);

  if (deleteError && !isMissingSchemaError(deleteError)) {
    throw new Error(deleteError.message);
  }

  try {
    await persistPurchaseOrderLines(context, purchaseOrderId, computation.lines);
  } catch (persistError) {
    if (!(persistError instanceof Error) || !isMissingSchemaError(persistError)) {
      throw persistError;
    }
    await context.supabase
      .from("purchase_orders")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          discount_total: computation.discount_total
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", purchaseOrderId);
  }

  return { purchaseOrder, computation };
}
