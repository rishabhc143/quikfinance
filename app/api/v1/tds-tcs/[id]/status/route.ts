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
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can update TDS/TCS status." });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!status) return fail(422, { code: "VALIDATION_FAILED", message: "Status is required." });

  const { data, error } = await auth.context.supabase
    .from("tds_tcs_records")
    .update({ status })
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error || !data) return fail(400, { code: "UPDATE_FAILED", message: error?.message ?? "Status could not be updated." });

  if (status === "review") {
    await upsertWorkflowException(auth.context, {
      category: "tax",
      severity: "medium",
      title: "TDS/TCS record awaiting review",
      description: `Record ${String((data as Record<string, unknown>).section_code ?? params.id)} needs review before posting.`,
      entityType: "tds_tcs_record",
      entityId: params.id
    });
  } else if (["posted", "filed"].includes(status)) {
    await resolveWorkflowExceptions(auth.context, {
      entityType: "tds_tcs_record",
      entityId: params.id,
      resolution: `Record moved to ${status}`
    });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "status_update",
    entity_type: "tds_tcs_record",
    entity_id: params.id,
    new_values: { status } as Json
  });

  return ok(data);
}
