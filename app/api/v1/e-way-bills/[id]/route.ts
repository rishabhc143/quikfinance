import { NextRequest } from "next/server";
import { canWriteData, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import { eWayBillSchema } from "@/lib/validations/deep-ops.schema";
import type { Json } from "@/types/database.types";

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data, error } = await auth.context.supabase
    .from("document_index")
    .select("id, file_name, extracted_fields, created_at, updated_at")
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return fail(404, { code: "NOT_FOUND", message: "E-Way Bill was not found." });
  }

  return ok(normalize(data as Record<string, unknown>));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = eWayBillSchema.partial().safeParse(body);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.error.flatten() });
  }

  const { data: existing, error: existingError } = await auth.context.supabase
    .from("document_index")
    .select("id, file_name, extracted_fields")
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id)
    .single();

  if (existingError || !existing) {
    return fail(404, { code: "NOT_FOUND", message: "E-Way Bill was not found." });
  }

  const current = typeof existing.extracted_fields === "object" && existing.extracted_fields !== null ? existing.extracted_fields as Record<string, unknown> : {};
  const next = { ...current, ...parsed.data };
  const lockDate = typeof next.generated_on === "string" ? next.generated_on : null;
  const lockResponse = await assertPeriodUnlocked(auth.context, lockDate, "sales");
  if (lockResponse) return lockResponse;

  const { data, error } = await auth.context.supabase
    .from("document_index")
    .update({ file_name: String(next.document_number ?? existing.file_name), extracted_fields: next as unknown as Json })
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id)
    .select("id, file_name, extracted_fields, created_at, updated_at")
    .single();

  if (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "update",
    entity_type: "e_way_bill",
    entity_id: params.id,
    new_values: next as unknown as Json
  });

  return ok(normalize(data as Record<string, unknown>));
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const { error } = await auth.context.supabase
    .from("document_index")
    .delete()
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill")
    .eq("id", params.id);

  if (error) {
    return fail(400, { code: "DELETE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "delete",
    entity_type: "e_way_bill",
    entity_id: params.id,
    new_values: { id: params.id }
  });

  return ok({ id: params.id });
}
