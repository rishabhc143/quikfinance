import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import type { Json } from "@/types/database.types";

function addDays(date: string, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function normalize(row: Record<string, unknown>) {
  const extracted = typeof row.extracted_fields === "object" && row.extracted_fields !== null ? row.extracted_fields as Record<string, unknown> : {};
  return {
    id: row.id,
    ...extracted,
    document_number: extracted.document_number ?? row.file_name,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const dispatchId = typeof body.dispatch_id === "string" ? body.dispatch_id : "";
  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : null;

  if (!dispatchId) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Dispatch is required." });
  }

  const { data: dispatch, error: dispatchError } = await auth.context.supabase
    .from("delivery_dispatches")
    .select("id, dispatch_number, dispatch_date, carrier_name, tracking_number, shipped_value, status")
    .eq("org_id", auth.context.orgId)
    .eq("id", dispatchId)
    .single();

  if (dispatchError || !dispatch) {
    return fail(404, { code: "DISPATCH_NOT_FOUND", message: "Dispatch was not found." });
  }

  let invoice: { id: string; invoice_number: string; subtotal: number; tax_total: number } | null = null;
  if (invoiceId) {
    const { data } = await auth.context.supabase
      .from("invoices")
      .select("id, invoice_number, subtotal, tax_total")
      .eq("org_id", auth.context.orgId)
      .eq("id", invoiceId)
      .single();
    invoice = (data as { id: string; invoice_number: string; subtotal: number; tax_total: number } | null) ?? null;
  }

  const generatedOn = String(dispatch.dispatch_date ?? new Date().toISOString().slice(0, 10));
  const documentNumber = typeof body.document_number === "string" && body.document_number.trim() ? body.document_number.trim() : `EWB-${Date.now().toString().slice(-6)}`;
  const status = String(dispatch.status) === "shipped" || String(dispatch.status) === "delivered" ? "ready" : "draft";
  const extracted = {
    dispatch_id: String(dispatch.id),
    invoice_id: invoice?.id ?? null,
    dispatch_number: String(dispatch.dispatch_number ?? ""),
    invoice_number: invoice?.invoice_number ?? null,
    document_number: documentNumber,
    generated_on: generatedOn,
    transport_mode: typeof body.transport_mode === "string" ? body.transport_mode : "road",
    transporter_name: typeof body.transporter_name === "string" ? body.transporter_name : String(dispatch.carrier_name ?? ""),
    vehicle_number: typeof body.vehicle_number === "string" ? body.vehicle_number : null,
    tracking_number: typeof body.tracking_number === "string" ? body.tracking_number : String(dispatch.tracking_number ?? ""),
    distance_km: Number(body.distance_km ?? 0),
    taxable_value: Number(invoice?.subtotal ?? dispatch.shipped_value ?? 0),
    total_tax: Number(invoice?.tax_total ?? 0),
    valid_until: status === "ready" ? addDays(generatedOn, 1) : null,
    status,
    notes: typeof body.notes === "string" ? body.notes : null,
    created_by: auth.context.userId
  };

  const { data, error } = await auth.context.supabase
    .from("document_index")
    .insert({
      org_id: auth.context.orgId,
      entity_type: "e_way_bill",
      entity_id: invoice?.id ?? String(dispatch.id),
      document_type: "e_way_bill",
      file_name: documentNumber,
      status: "indexed",
      extracted_fields: extracted as unknown as Json,
      created_by: auth.context.userId
    })
    .select("id, file_name, extracted_fields, created_at, updated_at")
    .single();

  if (error) {
    return fail(400, { code: "CREATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "generate",
    entity_type: "e_way_bill",
    entity_id: String((data as { id?: string }).id ?? ""),
    new_values: extracted as unknown as Json
  });

  return ok(normalize(data as Record<string, unknown>), undefined, { status: 201 });
}
