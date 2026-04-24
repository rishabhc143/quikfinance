import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createInvoiceTransaction, postInvoiceJournal } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { invoiceSchema } from "@/lib/validations/invoice.schema";
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
    entity_type: "invoice",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { page, perPage, from, to } = parsePaging(new URL(request.url));
  const search = new URL(request.url).searchParams.get("search");

  let query = auth.context.supabase
    .from("invoices")
    .select("id, contact_id, invoice_number, issue_date, due_date, total, balance_due, tax_total, status, currency, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (search) {
    query = query.ilike("invoice_number", `%${search}%`);
  }

  const { data, error, count } = await query.order("issue_date", { ascending: false }).range(from, to);
  if (error) return fail(400, { code: "LIST_FAILED", message: error.message });

  const contactMap = await loadContactNames(auth.context, (data ?? []).map((row) => String(row.contact_id)));
  const rows = (data ?? []).map((row) => ({
    ...row,
    customer: contactMap.get(String(row.contact_id)) ?? "Customer"
  }));

  return ok(rows, { total: count ?? 0, page, per_page: perPage });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const json = await parseJson(request);
  const parsed = invoiceSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The invoice payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.issue_date, "sales");
  if (lockResponse) return lockResponse;

  try {
    const { invoice } = await createInvoiceTransaction(auth.context, parsed.data as Record<string, unknown>);
    if (invoice.status !== "draft") {
      await postInvoiceJournal(auth.context, String(invoice.id));
    }

    await audit(auth.context, "create", String(invoice.id), parsed.data as unknown as Json);
    return ok(invoice, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Invoice could not be created." });
  }
}
