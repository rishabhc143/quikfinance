import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const salesOrderId = typeof body.sales_order_id === "string" ? body.sales_order_id : "";
  if (!salesOrderId) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Sales order is required." });
  }

  const { data: order, error: orderError } = await auth.context.supabase
    .from("sales_orders")
    .select("id, contact_id, issue_date, total, sales_order_number, status")
    .eq("org_id", auth.context.orgId)
    .eq("id", salesOrderId)
    .single();

  if (orderError || !order) {
    return fail(404, { code: "SALES_ORDER_NOT_FOUND", message: "Sales order was not found." });
  }

  const { data: existing } = await auth.context.supabase
    .from("delivery_dispatches")
    .select("id")
    .eq("org_id", auth.context.orgId)
    .eq("sales_order_id", salesOrderId)
    .maybeSingle();
  if (existing?.id) {
    return fail(409, { code: "DISPATCH_EXISTS", message: "A dispatch already exists for this sales order." });
  }

  const payload = {
    org_id: auth.context.orgId,
    sales_order_id: String(order.id),
    customer_id: String(order.contact_id ?? "") || null,
    dispatch_number: `DSP-${Date.now().toString().slice(-6)}`,
    dispatch_date: new Date().toISOString().slice(0, 10),
    carrier_name: typeof body.carrier_name === "string" && body.carrier_name.trim() ? body.carrier_name.trim() : "Pending carrier",
    tracking_number: null,
    shipped_value: Number(order.total ?? 0),
    status: "draft",
    proof_status: "pending",
    notes: `Generated from sales order ${String(order.sales_order_number ?? "")}`,
    created_by: auth.context.userId
  };

  const { data, error } = await auth.context.supabase.from("delivery_dispatches").insert(payload).select("*").single();
  if (error) {
    return fail(400, { code: "CREATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "create_from_sales_order",
    entity_type: "delivery_dispatch",
    entity_id: String((data as { id?: string }).id ?? ""),
    new_values: payload as unknown as Json
  });

  return ok(data, undefined, { status: 201 });
}

