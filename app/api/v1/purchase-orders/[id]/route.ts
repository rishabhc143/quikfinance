import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { parsePurchaseOrderFallbackNotes, updatePurchaseOrderDocument } from "@/lib/commercial/purchase-orders";
import { fail, ok } from "@/lib/api/responses";
import { purchaseOrderSchema } from "@/lib/validations/commercial.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "purchase_order",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: purchaseOrder, error } = await auth.context.supabase
    .from("purchase_orders")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (error || !purchaseOrder) return fail(404, { code: "NOT_FOUND", message: "Purchase order not found." });

  const [{ data: vendor }, lineQuery] = await Promise.all([
    auth.context.supabase.from("contacts").select("id, display_name, email").eq("org_id", auth.context.orgId).eq("id", purchaseOrder.contact_id).maybeSingle(),
    auth.context.supabase.from("purchase_order_lines").select("*").eq("org_id", auth.context.orgId).eq("purchase_order_id", params.id).order("display_order", { ascending: true })
  ]);

  const fallback = parsePurchaseOrderFallbackNotes(purchaseOrder.notes);
  const lineItems = lineQuery.error ? fallback.meta?.line_items ?? [] : (lineQuery.data ?? []);

  return ok({
    ...purchaseOrder,
    notes: fallback.notes,
    discount_total: (purchaseOrder as { discount_total?: number }).discount_total ?? fallback.meta?.discount_total ?? 0,
    vendor: vendor?.display_name ?? "Vendor",
    vendor_email: vendor?.email ?? null,
    line_items: lineItems
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("purchase_orders")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Purchase order not found." });

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = purchaseOrderSchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The purchase order payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const { purchaseOrder } = await updatePurchaseOrderDocument(auth.context, params.id, parsed.data);
    await audit(auth.context, "update", params.id, json as Json);
    return ok(purchaseOrder);
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Purchase order could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("purchase_orders")
    .select("id, status, issue_date")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Purchase order not found." });
  if (existing.status === "received") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Received purchase orders cannot be deleted." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.issue_date), "purchases");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("purchase_orders").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
