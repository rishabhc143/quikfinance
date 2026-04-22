import type { NextRequest } from "next/server";
import { z } from "zod";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Database, Json } from "@/types/database.types";

type TableName = keyof Database["public"]["Tables"];
type BodyRecord = Record<string, unknown>;
type QueryError = { message: string };
type QueryResult = { data: unknown; error: QueryError | null; count?: number | null };
type QueryLike = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryLike;
  ilike: (column: string, pattern: string) => QueryLike;
  order: (column: string, options: { ascending: boolean }) => QueryLike;
  range: (from: number, to: number) => Promise<{ data: unknown; error: QueryError | null; count: number | null }>;
  select: (columns?: string) => QueryLike;
  single: () => Promise<{ data: unknown; error: QueryError | null }>;
};

export type CrudConfig<T extends TableName> = {
  table: T;
  schema: z.ZodType<unknown>;
  entity: string;
  select?: string;
  searchColumn?: string;
  orderColumn?: string;
  orgScoped?: boolean;
  fixedFilters?: Record<string, string | number | boolean>;
  prepareCreate?: (body: BodyRecord, context: ApiContext) => BodyRecord;
  prepareUpdate?: (body: BodyRecord, context: ApiContext) => BodyRecord;
  lockDateField?: string;
  lockScope?: "all" | "sales" | "purchases" | "banking" | "journals";
};

type RouteContext = {
  params: {
    id: string;
  };
};

function isRecord(value: unknown): value is BodyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecordId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.id === "string" ? value.id : null;
}

function readRecordField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const entry = value[field];
  return typeof entry === "string" ? entry : null;
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

function asQuery(value: unknown): QueryLike {
  return value as QueryLike;
}

function applyFilters<T extends TableName>(query: QueryLike, config: CrudConfig<T>, context: ApiContext) {
  let filtered = query;
  if (config.orgScoped !== false) {
    filtered = filtered.eq("org_id", context.orgId);
  }
  Object.entries(config.fixedFilters ?? {}).forEach(([column, value]) => {
    filtered = filtered.eq(column, value);
  });
  return filtered;
}

export function createCrudHandlers<T extends TableName>(config: CrudConfig<T>) {
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

      let query = applyFilters(
        asQuery(auth.context.supabase.from(config.table).select(config.select ?? "*", { count: "exact" })),
        config,
        auth.context
      );

      if (search && config.searchColumn) {
        query = query.ilike(config.searchColumn, `%${search}%`);
      }

      const { data, error, count } = await query
        .order(config.orderColumn ?? "created_at", { ascending: false })
        .range(from, to);

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
        return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.error?.flatten() });
      }

      const prepared = config.prepareCreate?.(parsed.data, auth.context) ?? parsed.data;
      if (config.lockDateField && config.lockScope) {
        const lockResponse = await assertPeriodUnlocked(auth.context, readRecordField(prepared, config.lockDateField), config.lockScope);
        if (lockResponse) {
          return lockResponse;
        }
      }
      const payload = config.orgScoped === false ? prepared : { ...prepared, org_id: auth.context.orgId };
      const { data, error } = await auth.context.supabase
        .from(config.table)
        .insert(payload as never)
        .select(config.select ?? "*")
        .single();

      if (error) {
        return fail(400, { code: "CREATE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "create", readRecordId(data), payload as Json);
      return ok(data, undefined, { status: 201 });
    }
  };
}

export function createCrudItemHandlers<T extends TableName>(config: CrudConfig<T>) {
  return {
    GET: async (_request: NextRequest, { params }: RouteContext) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const { data, error } = await applyFilters(
        asQuery(auth.context.supabase.from(config.table).select(config.select ?? "*")),
        config,
        auth.context
      )
        .eq("id", params.id)
        .single();

      if (error || !data) {
        return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
      }

      return ok(data);
    },
    PUT: async (request: NextRequest, { params }: RouteContext) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      const json = await parseJson(request);
      const partialSchema = config.schema instanceof z.ZodObject ? config.schema.partial() : config.schema;
      const parsed = partialSchema.safeParse(json);
      if (!parsed.success || !isRecord(parsed.data)) {
        return fail(422, { code: "VALIDATION_FAILED", message: "The submitted data is invalid.", details: parsed.error?.flatten() });
      }

      const prepared = config.prepareUpdate?.(parsed.data, auth.context) ?? parsed.data;
      if (config.lockDateField && config.lockScope) {
        const { data: existing, error: existingError } = await applyFilters(
          asQuery(auth.context.supabase.from(config.table).select(config.lockDateField)),
          config,
          auth.context
        )
          .eq("id", params.id)
          .single();

        if (existingError) {
          return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
        }

        const lockDate = readRecordField(prepared, config.lockDateField) ?? readRecordField(existing, config.lockDateField);
        const lockResponse = await assertPeriodUnlocked(auth.context, lockDate, config.lockScope);
        if (lockResponse) {
          return lockResponse;
        }
      }
      const { data, error } = await applyFilters(asQuery(auth.context.supabase.from(config.table).update(prepared as never)), config, auth.context)
        .eq("id", params.id)
        .select(config.select ?? "*")
        .single();

      if (error) {
        return fail(400, { code: "UPDATE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "update", params.id, prepared as Json);
      return ok(data);
    },
    DELETE: async (_request: NextRequest, { params }: RouteContext) => {
      const auth = await requireApiContext();
      if (!auth.ok) {
        return fail(auth.status, { code: auth.code, message: auth.message });
      }

      if (config.lockDateField && config.lockScope) {
        const { data: existing, error: existingError } = await applyFilters(
          asQuery(auth.context.supabase.from(config.table).select(config.lockDateField)),
          config,
          auth.context
        )
          .eq("id", params.id)
          .single();

        if (existingError) {
          return fail(404, { code: "NOT_FOUND", message: `${config.entity} was not found.` });
        }

        const lockResponse = await assertPeriodUnlocked(auth.context, readRecordField(existing, config.lockDateField), config.lockScope);
        if (lockResponse) {
          return lockResponse;
        }
      }

      const { error } = await applyFilters(asQuery(auth.context.supabase.from(config.table).delete()), config, auth.context).eq("id", params.id);
      if (error) {
        return fail(400, { code: "DELETE_FAILED", message: error.message });
      }

      await audit(auth.context, config.entity, "delete", params.id, { id: params.id });
      return ok({ id: params.id });
    }
  };
}

export function createMethodNotAllowed() {
  return fail(405, { code: "METHOD_NOT_ALLOWED", message: "This operation is not supported for the resource." });
}

export function routeError(error: unknown) {
  return fail(500, { code: "SERVER_ERROR", message: errorMessage(error) });
}
