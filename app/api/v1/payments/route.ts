import { z } from "zod";
import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createPaymentTransaction } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { paymentSchema } from "@/lib/validations/operations.schema";
import { idSchema } from "@/lib/validations/common.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

const paymentCreateSchema = paymentSchema.extend({
  invoice_id: idSchema.optional().nullable(),
  bill_id: idSchema.optional().nullable(),
  bank_account_id: idSchema.optional().nullable()
}).refine((value) => !(value.invoice_id && value.bill_id), {
  message: "A payment can be linked to either an invoice or a bill, not both.",
  path: ["invoice_id"]
}).refine((value) => !(value.invoice_id && value.payment_type !== "received"), {
  message: "Invoice payments must use the received type.",
  path: ["payment_type"]
}).refine((value) => !(value.bill_id && value.payment_type !== "made"), {
  message: "Bill payments must use the made type.",
  path: ["payment_type"]
});

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
    entity_type: "payment",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const { page, perPage, from, to } = parsePaging(url);

  let query = auth.context.supabase
    .from("payments")
    .select("id, contact_id, payment_type, payment_date, amount, unapplied_amount, currency, exchange_rate, method, reference, status, memo, deposit_account_id, journal_entry_id, created_at, updated_at", { count: "exact" })
    .eq("org_id", auth.context.orgId);

  if (type === "received" || type === "made") {
    query = query.eq("payment_type", type);
  }
  if (search) {
    query = query.ilike("reference", `%${search}%`);
  }

  const { data, error, count } = await query.order("payment_date", { ascending: false }).range(from, to);
  if (error) return fail(400, { code: "LIST_FAILED", message: error.message });

  const contactMap = await loadContactNames(auth.context, (data ?? []).map((row) => String(row.contact_id)).filter((value) => value && value !== "null"));
  const rows = (data ?? []).map((row) => ({
    ...row,
    customer: row.payment_type === "received" ? contactMap.get(String(row.contact_id)) ?? "Customer" : undefined,
    vendor: row.payment_type === "made" ? contactMap.get(String(row.contact_id)) ?? "Vendor" : undefined
  }));

  return ok(rows, { total: count ?? 0, page, per_page: perPage });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const json = await parseJson(request);
  const parsed = paymentCreateSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The payment payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.payment_date, "all");
  if (lockResponse) return lockResponse;

  try {
    const payment = await createPaymentTransaction(auth.context, {
      ...parsed.data,
      invoice_id: parsed.data.invoice_id ?? null,
      bill_id: parsed.data.bill_id ?? null,
      bank_account_id: parsed.data.bank_account_id ?? null
    });

    await audit(auth.context, "create", String(payment.id), parsed.data as unknown as Json);
    return ok(payment, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Payment could not be created." });
  }
}
