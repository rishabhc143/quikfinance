import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createBillTransaction, postBillJournal } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { billSchema } from "@/lib/validations/bill.schema";
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
    entity_type: "bill",
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
    .from("bills")
    .select("id, contact_id, bill_number, issue_date, due_date, total, balance_due, tax_total, status, currency, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (search) {
    query = query.ilike("bill_number", `%${search}%`);
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
  const parsed = billSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The bill payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "purchases");
  if (lockResponse) return lockResponse;

  try {
    const { bill } = await createBillTransaction(auth.context, parsed.data as Record<string, unknown>);
    if (bill.status !== "draft") {
      await postBillJournal(auth.context, String(bill.id));
    }

    await audit(auth.context, "create", String(bill.id), parsed.data as unknown as Json);
    return ok(bill, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Bill could not be created." });
  }
}
