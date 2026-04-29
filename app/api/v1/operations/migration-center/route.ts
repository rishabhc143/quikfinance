import { canManageFinance, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { analyzeImportPayload, type PreviewEntityType } from "@/lib/imports/preview";

export const dynamic = "force-dynamic";

type MigrationBatchRecord = {
  id: string;
  source_type: string;
  entity_type: string;
  file_name?: string | null;
  status: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  validation_summary?: Record<string, unknown> | null;
  created_at?: string;
};

function parseEntityType(value: unknown): PreviewEntityType {
  if (value === "customers" || value === "vendors" || value === "invoices" || value === "bills" || value === "payments" || value === "bank_transactions") {
    return value;
  }
  return "trial_balance";
}

export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  try {
    const { data, error } = await auth.context.supabase
      .from("migration_batches")
      .select("id, created_at, source_type, entity_type, file_name, status, total_rows, imported_rows, failed_rows, validation_summary")
      .eq("org_id", auth.context.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return fail(400, { code: "MIGRATION_CENTER_LIST_FAILED", message: error.message });
    }

    const rows = (data ?? []) as MigrationBatchRecord[];
    return ok({
      records: rows,
      summary: {
        total: rows.length,
        ready: rows.filter((row) => row.status === "ready").length,
        review: rows.filter((row) => row.status === "validating").length,
        imported: rows.reduce((sum, row) => sum + Number(row.imported_rows ?? 0), 0),
        failed: rows.reduce((sum, row) => sum + Number(row.failed_rows ?? 0), 0)
      }
    });
  } catch (error) {
    return fail(500, { code: "MIGRATION_CENTER_LIST_FAILED", message: errorMessage(error) });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "FINANCE_ROLE_REQUIRED", message: "Only finance roles can manage migration batches." });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const entityType = parseEntityType(body.entity_type);
    const payloadText = typeof body.payload_text === "string" ? body.payload_text : "";
    const preview = analyzeImportPayload(entityType, payloadText);

    const { data, error } = await auth.context.supabase
      .from("migration_batches")
      .insert({
        org_id: auth.context.orgId,
        source_type: typeof body.source_type === "string" ? body.source_type : "csv",
        entity_type: entityType,
        file_name: typeof body.file_name === "string" && body.file_name ? body.file_name : null,
        status: preview.readiness === "ready" ? "ready" : preview.readiness === "review" ? "validating" : "failed",
        total_rows: preview.totalRows,
        imported_rows: 0,
        failed_rows: preview.readiness === "failed" ? preview.totalRows : 0,
        validation_summary: {
          columns: preview.columns,
          warnings: preview.warnings,
          sample_rows: preview.sampleRows,
          payload_preview_present: preview.totalRows > 0,
          readiness: preview.readiness,
          notes: typeof body.notes === "string" ? body.notes : null
        },
        created_by: auth.context.userId
      })
      .select("id, created_at, source_type, entity_type, file_name, status, total_rows, imported_rows, failed_rows, validation_summary")
      .single();

    if (error || !data) {
      return fail(400, { code: "MIGRATION_CENTER_CREATE_FAILED", message: error?.message ?? "Migration batch could not be created." });
    }

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: "create",
      entity_type: "migration_batch",
      entity_id: data.id,
      new_values: data.validation_summary ?? {}
    });

    return ok(data, undefined, { status: 201 });
  } catch (error) {
    return fail(500, { code: "MIGRATION_CENTER_CREATE_FAILED", message: errorMessage(error) });
  }
}

