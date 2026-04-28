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
  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
  if (!invoiceId) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Invoice is required." });
  }

  const { data: invoice, error: invoiceError } = await auth.context.supabase
    .from("invoices")
    .select("id, invoice_number, issue_date, subtotal, tax_total, status")
    .eq("org_id", auth.context.orgId)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return fail(404, { code: "INVOICE_NOT_FOUND", message: "Invoice was not found." });
  }

  if (["draft", "void"].includes(String(invoice.status))) {
    return fail(422, { code: "INELIGIBLE_INVOICE", message: "Only finalized invoices can be queued for e-invoicing." });
  }

  const { data: existing } = await auth.context.supabase
    .from("e_invoice_submissions")
    .select("id, status")
    .eq("org_id", auth.context.orgId)
    .eq("invoice_id", invoiceId)
    .in("status", ["draft", "queued", "submitted", "generated"])
    .maybeSingle();

  if (existing?.id) {
    return fail(409, { code: "ALREADY_EXISTS", message: "An active e-invoice submission already exists for this invoice." });
  }

  const payload = {
    org_id: auth.context.orgId,
    invoice_id: String(invoice.id),
    invoice_number: String(invoice.invoice_number ?? ""),
    submission_number: `EINV-${Date.now().toString().slice(-6)}`,
    submission_date: new Date().toISOString().slice(0, 10),
    taxable_value: Number(invoice.subtotal ?? 0),
    total_tax: Number(invoice.tax_total ?? 0),
    status: "queued",
    created_by: auth.context.userId
  };

  const { data, error } = await auth.context.supabase.from("e_invoice_submissions").insert(payload).select("*").single();
  if (error) {
    return fail(400, { code: "CREATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "queue",
    entity_type: "e_invoice_submission",
    entity_id: String((data as { id?: string }).id ?? ""),
    new_values: payload as unknown as Json
  });

  return ok(data, undefined, { status: 201 });
}
