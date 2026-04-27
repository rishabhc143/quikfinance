import { computeDocumentTotals } from "@/lib/accounting/transactions";
import type { ApiContext } from "@/lib/api/auth";

type SalesOrderInput = {
  contact_id: string;
  sales_order_number?: string;
  issue_date: string;
  due_date?: string;
  status?: "draft" | "confirmed" | "fulfilled" | "cancelled";
  currency?: string;
  subtotal?: number;
  discount_total?: number;
  tax_total?: number;
  total?: number;
  place_of_supply?: string | null;
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

const META_PREFIX = "[[QF_SALES_ORDER_META]]";

function nextSalesOrderNumber() {
  return `SO-${Date.now().toString().slice(-6)}`;
}

function isMissingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("column") || message.includes("relation") || message.includes("schema cache");
}

function buildFallbackNotes(
  notes: string | null | undefined,
  meta: {
    line_items: SalesOrderInput["line_items"];
    place_of_supply?: string | null;
  }
) {
  const plainNotes = typeof notes === "string" ? notes.trim() : "";
  return `${META_PREFIX}${JSON.stringify(meta)}\n\n${plainNotes}`.trim();
}

export function parseSalesOrderFallbackNotes(notes: string | null | undefined) {
  const text = typeof notes === "string" ? notes : "";
  if (!text.startsWith(META_PREFIX)) {
    return {
      notes: text || null,
      meta: null as null | { line_items?: SalesOrderInput["line_items"]; place_of_supply?: string | null }
    };
  }

  const separator = text.indexOf("\n\n");
  const metaChunk = separator >= 0 ? text.slice(META_PREFIX.length, separator).trim() : text.slice(META_PREFIX.length).trim();
  const notesChunk = separator >= 0 ? text.slice(separator + 2).trim() : "";

  try {
    return {
      notes: notesChunk || null,
      meta: JSON.parse(metaChunk) as { line_items?: SalesOrderInput["line_items"]; place_of_supply?: string | null }
    };
  } catch {
    return { notes: text || null, meta: null };
  }
}

export async function persistSalesOrderLines(
  context: ApiContext,
  salesOrderId: string,
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
    sales_order_id: salesOrderId,
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

  const { error } = await context.supabase.from("sales_order_lines").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

export async function createSalesOrderDocument(context: ApiContext, input: SalesOrderInput) {
  const lineItems = Array.isArray(input.line_items) ? input.line_items : [];
  const salesOrderNumber =
    typeof input.sales_order_number === "string" && input.sales_order_number.trim()
      ? input.sales_order_number.trim()
      : nextSalesOrderNumber();

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
    sales_order_number: salesOrderNumber,
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
    place_of_supply: placeOfSupply
  };

  let insertResult = await context.supabase.from("sales_orders").insert(insertPayload).select("*").single();
  if (insertResult.error && isMissingSchemaError(insertResult.error)) {
    insertPayload = {
      ...baseInsert,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        place_of_supply: placeOfSupply
      })
    };
    insertResult = await context.supabase.from("sales_orders").insert(insertPayload).select("*").single();
  }

  const { data: salesOrder, error } = insertResult;
  if (error || !salesOrder) {
    throw new Error(error?.message ?? "Sales order could not be created.");
  }

  try {
    await persistSalesOrderLines(context, String(salesOrder.id), computation.lines);
  } catch (persistError) {
    if (!(persistError instanceof Error) || !isMissingSchemaError(persistError)) {
      throw persistError;
    }
    await context.supabase
      .from("sales_orders")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          place_of_supply: placeOfSupply
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", salesOrder.id);
  }

  return { salesOrder, computation };
}

export async function updateSalesOrderDocument(context: ApiContext, salesOrderId: string, input: SalesOrderInput) {
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
    sales_order_number: input.sales_order_number?.trim() || undefined,
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
    place_of_supply: placeOfSupply
  };

  let updateResult = await context.supabase
    .from("sales_orders")
    .update(updatePayload)
    .eq("org_id", context.orgId)
    .eq("id", salesOrderId)
    .select("*")
    .single();

  if (updateResult.error && isMissingSchemaError(updateResult.error)) {
    updatePayload = {
      ...baseUpdate,
      notes: buildFallbackNotes(input.notes, {
        line_items: input.line_items,
        place_of_supply: placeOfSupply
      })
    };
    updateResult = await context.supabase
      .from("sales_orders")
      .update(updatePayload)
      .eq("org_id", context.orgId)
      .eq("id", salesOrderId)
      .select("*")
      .single();
  }

  const { data: salesOrder, error } = updateResult;
  if (error || !salesOrder) {
    throw new Error(error?.message ?? "Sales order could not be updated.");
  }

  const { error: deleteError } = await context.supabase
    .from("sales_order_lines")
    .delete()
    .eq("org_id", context.orgId)
    .eq("sales_order_id", salesOrderId);

  if (deleteError && !isMissingSchemaError(deleteError)) {
    throw new Error(deleteError.message);
  }

  try {
    await persistSalesOrderLines(context, salesOrderId, computation.lines);
  } catch (persistError) {
    if (!(persistError instanceof Error) || !isMissingSchemaError(persistError)) {
      throw persistError;
    }
    await context.supabase
      .from("sales_orders")
      .update({
        notes: buildFallbackNotes(input.notes, {
          line_items: input.line_items,
          place_of_supply: placeOfSupply
        })
      })
      .eq("org_id", context.orgId)
      .eq("id", salesOrderId);
  }

  return { salesOrder, computation };
}
