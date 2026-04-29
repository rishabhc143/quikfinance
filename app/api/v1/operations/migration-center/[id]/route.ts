import { canManageFinance, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "FINANCE_ROLE_REQUIRED", message: "Only finance roles can manage migration batches." });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = body.status === "mapping" || body.status === "validating" || body.status === "ready" || body.status === "imported" || body.status === "failed"
      ? body.status
      : null;
    if (!status) {
      return fail(422, { code: "STATUS_REQUIRED", message: "Choose a valid migration batch status." });
    }

    const { data: existing, error: existingError } = await auth.context.supabase
      .from("migration_batches")
      .select("validation_summary")
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .single();

    if (existingError || !existing) {
      return fail(404, { code: "NOT_FOUND", message: "Migration batch not found." });
    }

    const validationSummary = typeof existing.validation_summary === "object" && existing.validation_summary ? { ...existing.validation_summary } : {};
    if (typeof body.mapping_notes === "string") {
      validationSummary.mapping_notes = body.mapping_notes;
    }
    validationSummary.last_status_change_at = new Date().toISOString();
    validationSummary.last_status_change_by = auth.context.userId;

    const { data, error } = await auth.context.supabase
      .from("migration_batches")
      .update({ status, validation_summary: validationSummary })
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .select("id, created_at, source_type, entity_type, file_name, status, total_rows, imported_rows, failed_rows, validation_summary")
      .single();

    if (error || !data) {
      return fail(400, { code: "MIGRATION_CENTER_UPDATE_FAILED", message: error?.message ?? "Migration batch could not be updated." });
    }

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: "status_update",
      entity_type: "migration_batch",
      entity_id: params.id,
      new_values: { status, mapping_notes: body.mapping_notes ?? null }
    });

    return ok(data);
  } catch (error) {
    return fail(500, { code: "MIGRATION_CENTER_UPDATE_FAILED", message: errorMessage(error) });
  }
}

