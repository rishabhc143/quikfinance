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
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can update e-way bill status." });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!status) return fail(422, { code: "VALIDATION_FAILED", message: "Status is required." });

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("document_index")
    .select("id, file_name, extracted_fields")
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id)
    .single();
  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "E-Way Bill was not found." });

  const extracted = typeof existing.extracted_fields === "object" && existing.extracted_fields !== null ? existing.extracted_fields as Record<string, unknown> : {};
  const next: Record<string, unknown> = { ...extracted, status };
  if (status === "generated" && !next.valid_until) {
    const base = typeof next.generated_on === "string" ? new Date(next.generated_on) : new Date();
    base.setDate(base.getDate() + 1);
    next.valid_until = base.toISOString().slice(0, 10);
  }

  const { data, error } = await auth.context.supabase
    .from("document_index")
    .update({ extracted_fields: next as Json, file_name: String(next.document_number ?? existing.file_name) })
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id)
    .select("id, file_name, extracted_fields, created_at, updated_at")
    .single();
  if (error || !data) return fail(400, { code: "UPDATE_FAILED", message: error?.message ?? "Status could not be updated." });

  if (status === "expired") {
    await upsertWorkflowException(auth.context, {
      category: "gst",
      severity: "high",
      title: "E-Way Bill expired",
      description: `Movement document ${String(next.document_number ?? params.id)} has expired and needs regeneration.`,
      entityType: "e_way_bill",
      entityId: params.id
    });
  } else if (["generated", "cancelled"].includes(status)) {
    await resolveWorkflowExceptions(auth.context, {
      entityType: "e_way_bill",
      entityId: params.id,
      resolution: `Document moved to ${status}`
    });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "status_update",
    entity_type: "e_way_bill",
    entity_id: params.id,
    new_values: { status } as Json
  });

  return ok({
    id: (data as Record<string, unknown>).id,
    ...(typeof (data as Record<string, unknown>).extracted_fields === "object" && (data as Record<string, unknown>).extracted_fields !== null ? (data as Record<string, unknown>).extracted_fields as Record<string, unknown> : {}),
    created_at: (data as Record<string, unknown>).created_at,
    updated_at: (data as Record<string, unknown>).updated_at
  });
}
