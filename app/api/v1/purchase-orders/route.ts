import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createPurchaseOrderDocument } from "@/lib/commercial/purchase-orders";
import { fail, ok } from "@/lib/api/responses";
import { purchaseOrderSchema } from "@/lib/validations/commercial.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

function parsePaging(url: URL) {
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(Math.max(Number(url.searchParams.get("per_page") ?? "25"), 1), 100);
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function loadContactNames(context: ApiContext, contactIds: string[]) {
  if (!contactIds.length) return new Map<string, string>();
  const unique = [...new Set(contactIds)];
  const { data } = await context.supabase.from("contacts").select("id, display_name").eq("org_id", context.orgId).in("id", unique);
  return new Map((data ?? []).map((row) => [String(row.id), String(row.display_name ?? "Unknown")]));
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "purchase_order",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const url = new URL(request.url);
  const { page, perPage, from, to } = parsePaging(url);
  const search = url.searchParams.get("search");

  let query = auth.context.supabase
    .from("purchase_orders")
    .select("id, contact_id, purchase_order_number, issue_date, due_date, total, status, currency, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (search) {
    query = query.ilike("purchase_order_number", `%${search}%`);
  }

  const { data, error, count } = await query.order("issue_date", { ascending: false }).range(from, to);
  if (error) return fail(400, { code: "LIST_FAILED", message: error.message });

  const contactMap = await loadContactNames(auth.context, (data ?? []).map((row) => String(row.contact_id)));
  const rows = (data ?? []).map((row) => ({
    ...row,
    vendor: contactMap.get(String(row.contact_id)) ?? "Vendor"
  }));

  return ok(rows, { total: count ?? 0, page, per_page: perPage });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const json = await parseJson(request);
  const parsed = purchaseOrderSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The purchase order payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const { purchaseOrder } = await createPurchaseOrderDocument(auth.context, parsed.data);
    await audit(auth.context, "create", String(purchaseOrder.id), parsed.data as unknown as Json);
    return ok(purchaseOrder, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Purchase order could not be created." });
  }
}
