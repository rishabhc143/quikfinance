import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Json } from "@/types/database.types";
import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";

type BodyRecord = Record<string, unknown>;
type QueryError = { message: string } | null;

type QueryLike = PromiseLike<{ data: unknown; error: QueryError; count?: number | null }> & {
  eq: (column: string, value: unknown) => QueryLike;
  ilike: (column: string, pattern: string) => QueryLike;
  order: (column: string, options: { ascending: boolean }) => QueryLike;
  range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: QueryError; count: number | null }>;
  select: (columns?: string, options?: { count?: "exact" }) => QueryLike;
  insert: (payload: Record<string, unknown>) => QueryLike;
  update: (payload: Record<string, unknown>) => QueryLike;
  delete: () => QueryLike;
  single: () => Promise<{ data: unknown; error: QueryError }>;
};

type LockScope = "all" | "sales" | "purchases" | "banking" | "journals";

export type CustomCrudConfig = {
  table: string;
  schema: z.ZodType<Record<string, unknown>>;
  entity: string;
  select?: string;
  searchColumn?: string;
  orderColumn?: string;
  prepareCreate?: (body: BodyRecord, context: ApiContext) => BodyRecord;
  prepareUpdate?: (body: BodyRecord, context: ApiContext) => BodyRecord;
  lockDateField?: string;
  lockScope?: LockScope;
};

function asQuery(value: unknown): QueryLike {
  return value as QueryLike;
}

function isRecord(value: unknown): value is BodyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecordId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.id === "string" ? value.id : null;
}

function readStringField(value: unknown, field: string) {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value[field] === "string" ? value[field] : null;
}

async function parseJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function audit(context: ApiContext, entity: string, action: string, entityId: string | null, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: entity,
    entity_id: entityId,
    action,
    new_values: values
  });
}

function fromTable(supabase: unknown, table: string) {
  return asQuery((supabase as { from: (tableName: string) => unknown }).from(table));
}

function applyTenantFilter(query: QueryLike, context: ApiContext) {
  return query.eq("org_id", context.orgId);
}

async function enforceLockIfNeeded(config: CustomCrudConfig, context: ApiContext, payload: BodyRecord, existing?: unknown) {
  if (!config.lockDateField || !config.lockScope) {
    return null;
  }

  const lockDate = readStringField(payload, config.lockDateField) ?? readStringField(existing, config.lockDateField);
  return assertPeriodUnlocked(context, lockDate, config.lockScope);
}

export function createCustomCrudHandlers(config: CustomCrudConfig) {
  return {
    GET: async (request: NextRequest) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? "1"), 1);
      const perPage = Math.min(Math.max(Number(request.nextUrl.searchParams.get("per_page") ?? "25"), 1), 100);
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const search = request.nextUrl.searchParams.get("search");

      let query = applyTenantFilter(fromTable(auth.context.supabase, config.table).select(config.select ?? "*", { count: "exact" }), auth.context);
      if (search && config.searchColumn) {
        query = query.ilike(config.searchColumn, `%${search}%`);
      }

      const { data, error, count } = await query.order(config.orderColumn ?? "created_at", { ascending: false }).range(from, to);
      if (error) {
        return fail(500, { code: "LIST_FAILED", message: error.message });
      }

      return ok(data ?? [], { total: count ?? 0, page, per_page: perPage });
    },
    POST: async (request: NextRequest) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const json = await parseJson(request);
      const parsed = config.schema.safeParse(json);
      if (!parsed.success || !isRecord(parsed.data)) {
        return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.success ? undefined : parsed.error.flatten() });
      }

      const prepared = config.prepareCreate?.(parsed.data, auth.context) ?? parsed.data;
      const lockResponse = await enforceLockIfNeeded(config, auth.context, prepared);
      if (lockResponse) {
        return lockResponse;
      }

      const payload = { ...prepared, org_id: auth.context.orgId };
      const { data, error } = await fromTable(auth.context.supabase, config.table).insert(payload).select(config.select ?? "*").single();
      if (error) {
        return fail(400, { code: "CREATE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "create", readRecordId(data), payload as Json);
      return ok(data, undefined, { status: 201 });
    }
  };
}

export function createCustomCrudItemHandlers(config: CustomCrudConfig) {
  return {
    GET: async (_request: NextRequest, { params }: { params: { id: string } }) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const { data, error } = await applyTenantFilter(fromTable(auth.context.supabase, config.table).select(config.select ?? "*"), auth.context)
        .eq("id", params.id)
        .single();
      if (error || !data) {
        return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
      }

      return ok(data);
    },
    PUT: async (request: NextRequest, { params }: { params: { id: string } }) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const json = await parseJson(request);
      const partialSchema = config.schema instanceof z.ZodObject ? config.schema.partial() : config.schema;
      const parsed = partialSchema.safeParse(json);
      if (!parsed.success || !isRecord(parsed.data)) {
        return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.success ? undefined : parsed.error.flatten() });
      }

      const { data: existing, error: existingError } = await applyTenantFilter(fromTable(auth.context.supabase, config.table).select(config.lockDateField ?? "id"), auth.context)
        .eq("id", params.id)
        .single();
      if (existingError) {
        return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
      }

      const prepared = config.prepareUpdate?.(parsed.data, auth.context) ?? parsed.data;
      const lockResponse = await enforceLockIfNeeded(config, auth.context, prepared, existing);
      if (lockResponse) {
        return lockResponse;
      }

      const { data, error } = await applyTenantFilter(fromTable(auth.context.supabase, config.table).update(prepared), auth.context)
        .eq("id", params.id)
        .select(config.select ?? "*")
        .single();
      if (error) {
        return fail(400, { code: "UPDATE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "update", params.id, prepared as Json);
      return ok(data);
    },
    DELETE: async (_request: NextRequest, { params }: { params: { id: string } }) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const { data: existing, error: existingError } = await applyTenantFilter(fromTable(auth.context.supabase, config.table).select(config.lockDateField ?? "id"), auth.context)
        .eq("id", params.id)
        .single();
      if (existingError) {
        return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
      }

      const lockResponse = await enforceLockIfNeeded(config, auth.context, {}, existing);
      if (lockResponse) {
        return lockResponse;
      }

      const { error } = await applyTenantFilter(fromTable(auth.context.supabase, config.table).delete(), auth.context).eq("id", params.id);
      if (error) {
        return fail(400, { code: "DELETE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "delete", params.id, { id: params.id });
      return ok({ id: params.id });
    }
  };
}

export function routeError(error: unknown) {
  return fail(500, { code: "SERVER_ERROR", message: errorMessage(error) });
}
