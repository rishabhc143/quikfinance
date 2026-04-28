import { NextRequest } from "next/server";
import { canManageCompliance, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { resolveWorkflowExceptions, upsertWorkflowException } from "@/lib/compliance/exceptions";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canManageCompliance(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can update e-invoicing status." });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!status) return fail(422, { code: "VALIDATION_FAILED", message: "Status is required." });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("e_invoice_submissions")
    .select("*")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();
  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "E-invoice submission was not found." });

  const payload: Record<string, unknown> = { status };
  if (status === "generated") {
    payload.irn = typeof existing.irn === "string" && existing.irn ? existing.irn : `IRN-${Date.now().toString().slice(-8)}`;
    payload.ack_number = typeof existing.ack_number === "string" && existing.ack_number ? existing.ack_number : `ACK-${Date.now().toString().slice(-6)}`;
    payload.ack_date = typeof existing.ack_date === "string" && existing.ack_date ? existing.ack_date : new Date().toISOString().slice(0, 10);
    payload.error_message = null;
  }
  if (status === "failed") {
    payload.error_message = typeof body.error_message === "string" && body.error_message ? body.error_message : "Provider validation failed during e-invoice processing.";
  }

  const { data, error } = await auth.context.supabase
    .from("e_invoice_submissions")
    .update(payload)
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error || !data) return fail(400, { code: "UPDATE_FAILED", message: error?.message ?? "Status could not be updated." });

  if (status === "failed") {
    await upsertWorkflowException(auth.context, {
      category: "gst",
      severity: "high",
      title: "E-invoice submission failed",
      description: String(payload.error_message ?? "Submission failed"),
      entityType: "e_invoice_submission",
      entityId: params.id
    });
  } else if (["generated", "cancelled"].includes(status)) {
    await resolveWorkflowExceptions(auth.context, {
      entityType: "e_invoice_submission",
      entityId: params.id,
      resolution: `Submission moved to ${status}`
    });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "status_update",
    entity_type: "e_invoice_submission",
    entity_id: params.id,
    new_values: payload as Json
  });

  return ok(data);
}
