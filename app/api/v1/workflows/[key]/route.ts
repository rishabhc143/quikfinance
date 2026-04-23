import { NextRequest } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { getOperationalResource, type OperationalResource } from "@/lib/operational-resources";
import type { Json } from "@/types/database.types";

type QueryLike = {
  select: (columns?: string, options?: { count?: "exact" }) => QueryLike;
  eq: (column: string, value: unknown) => QueryLike;
  ilike: (column: string, value: string) => QueryLike;
  or: (filters: string) => QueryLike;
  order: (column: string, options: { ascending: boolean }) => QueryLike;
  range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: { message: string } | null; count: number | null }>;
  insert: (payload: Record<string, unknown>) => QueryLike;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

function fromTable(supabase: unknown, table: string): QueryLike {
  return (supabase as { from: (tableName: string) => QueryLike }).from(table);
}

function preparePayload(resource: OperationalResource, payload: Record<string, unknown>) {
  const prepared = { ...payload };
  const suffix = Date.now().toString().slice(-6);

  if (resource.key === "payment-operations" && prepared.settlement_id === "setl_demo_001") {
    prepared.settlement_id = `setl_demo_${suffix}`;
  }

  if (resource.key === "warehouses" && prepared.code === "MAIN") {
    prepared.code = `WH-${suffix}`;
    prepared.name = `Main Warehouse ${suffix}`;
  }

  if (resource.key === "rules-engine" && prepared.name === "Overdue invoice reminder") {
    prepared.name = `Overdue invoice reminder ${suffix}`;
  }

  return prepared;
}

function withOrg(resource: OperationalResource, payload: Record<string, unknown>, orgId: string, userId: string) {
  return {
    ...payload,
    org_id: orgId,
    ...Object.fromEntries((resource.userColumns ?? []).map((column) => [column, payload[column] ?? userId]))
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const resource = getOperationalResource(params.key);
  if (!resource) {
    return fail(404, { code: "WORKFLOW_NOT_FOUND", message: "Workflow resource is not configured." });
  }

  const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(Math.max(Number(request.nextUrl.searchParams.get("per_page") ?? "25"), 1), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const search = request.nextUrl.searchParams.get("search");

  let query = fromTable(auth.context.supabase, resource.table)
    .select("*", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (search && resource.searchableColumns.length > 0) {
    query = query.or(resource.searchableColumns.map((column) => `${column}.ilike.%${search}%`).join(","));
  }

  const { data, error, count } = await query
    .order(resource.orderColumn ?? "created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return fail(400, { code: "WORKFLOW_LIST_FAILED", message: error.message });
  }

  return ok({
    resource: { key: resource.key, title: resource.title },
    records: data ?? [],
    total: count ?? 0,
    page,
    per_page: perPage
  });
}

export async function POST(request: NextRequest, { params }: { params: { key: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const resource = getOperationalResource(params.key);
  if (!resource) {
    return fail(404, { code: "WORKFLOW_NOT_FOUND", message: "Workflow resource is not configured." });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = resource.schema.safeParse({ ...resource.sample, ...(typeof body === "object" && body ? body : {}) });
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Workflow record is invalid.", details: parsed.error.flatten() });
  }

  const payload = withOrg(resource, preparePayload(resource, parsed.data), auth.context.orgId, auth.context.userId);
  const { data, error } = await fromTable(auth.context.supabase, resource.table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return fail(400, { code: "WORKFLOW_CREATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "create",
    entity_type: resource.table,
    entity_id: typeof (data as { id?: unknown })?.id === "string" ? (data as { id: string }).id : null,
    new_values: payload as unknown as Json
  });

  return ok(data, undefined, { status: 201 });
}
