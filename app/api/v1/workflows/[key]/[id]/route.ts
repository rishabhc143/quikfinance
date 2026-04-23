import { NextRequest } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { getOperationalResource } from "@/lib/operational-resources";
import type { Json } from "@/types/database.types";

type MutationLike = PromiseLike<{ error: { message: string } | null }> & {
  eq: (column: string, value: unknown) => MutationLike;
  select: (columns?: string) => MutationLike;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

function tableClient(supabase: unknown, table: string) {
  return (supabase as {
    from: (tableName: string) => {
      update: (payload: Record<string, unknown>) => MutationLike;
      delete: () => MutationLike;
    };
  }).from(table);
}

function statusMetadata(table: string, status: unknown, userId: string) {
  if (typeof status !== "string") {
    return {};
  }

  if (table === "approval_requests" && ["approved", "rejected"].includes(status)) {
    return { approved_by: userId, decided_at: new Date().toISOString() };
  }

  if (table === "workflow_exceptions" && status === "resolved") {
    return { resolved_at: new Date().toISOString() };
  }

  if (table === "close_tasks" && status === "done") {
    return { completed_at: new Date().toISOString() };
  }

  return {};
}

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { key: string; id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const resource = getOperationalResource(params.key);
  if (!resource) {
    return fail(404, { code: "WORKFLOW_NOT_FOUND", message: "Workflow resource is not configured." });
  }

  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Workflow update is invalid." });
  }

  const patch = body as Record<string, unknown>;
  const payload = {
    ...patch,
    ...statusMetadata(resource.table, patch.status, auth.context.userId)
  };

  const { data, error } = await tableClient(auth.context.supabase, resource.table)
    .update(payload)
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return fail(400, { code: "WORKFLOW_UPDATE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "update",
    entity_type: resource.table,
    entity_id: params.id,
    new_values: payload as Json
  });

  return ok(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: { key: string; id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const resource = getOperationalResource(params.key);
  if (!resource) {
    return fail(404, { code: "WORKFLOW_NOT_FOUND", message: "Workflow resource is not configured." });
  }

  const { error } = await tableClient(auth.context.supabase, resource.table)
    .delete()
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id);

  if (error) {
    return fail(400, { code: "WORKFLOW_DELETE_FAILED", message: error.message });
  }

  await auth.context.supabase.from("audit_logs").insert({
    org_id: auth.context.orgId,
    user_id: auth.context.userId,
    action: "delete",
    entity_type: resource.table,
    entity_id: params.id,
    new_values: { id: params.id }
  });

  return ok({ id: params.id });
}
