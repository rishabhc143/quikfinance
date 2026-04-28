import { NextRequest } from "next/server";
import { z } from "zod";
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

function sequenceNumber() {
  return `EWB-${Date.now().toString().slice(-6)}`;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(Math.max(Number(request.nextUrl.searchParams.get("per_page") ?? "25"), 1), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const search = request.nextUrl.searchParams.get("search");

  let query = auth.context.supabase
    .from("document_index")
    .select("id, file_name, extracted_fields, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId)
    .eq("document_type", "e_way_bill");

  if (search) {
    query = query.ilike("file_name", `%${search}%`);
  }

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) {
    return fail(400, { code: "LIST_FAILED", message: error.message });
  }

  return ok((data ?? []).map((row) => normalize(row as Record<string, unknown>)), { total: count ?? 0, page, per_page: perPage });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = eWayBillSchema.safeParse(body);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.error.flatten() });
  }

  const payload = {
    ...parsed.data,
    document_number: parsed.data.document_number || sequenceNumber(),
    created_by: auth.context.userId
  };
  const lockResponse = await assertPeriodUnlocked(auth.context, payload.generated_on, "sales");
  if (lockResponse) return lockResponse;

  const { data, error } = await auth.context.supabase
    .from("document_index")
    .insert({
      org_id: auth.context.orgId,
      entity_type: "e_way_bill",
      entity_id: payload.invoice_id ?? payload.dispatch_id ?? null,
      document_type: "e_way_bill",
      file_name: payload.document_number,
      status: "indexed",
      extracted_fields: payload as unknown as Json,
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
    action: "create",
    entity_type: "e_way_bill",
    entity_id: String((data as { id?: string }).id ?? ""),
    new_values: payload as unknown as Json
  });

  return ok(normalize(data as Record<string, unknown>), undefined, { status: 201 });
}
