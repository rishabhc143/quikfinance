import { z } from "zod";
import { requireApiContext } from "@/lib/api/auth";
import { createPaymentTransaction } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { idSchema, moneySchema } from "@/lib/validations/common.schema";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

const recordPaymentSchema = z.object({
  payment_date: z.coerce.date().transform((value) => value.toISOString().slice(0, 10)),
  amount: moneySchema.refine((value) => value > 0, "Amount must be greater than zero."),
  method: z.string().trim().min(2).max(80),
  reference: z.string().trim().max(120).optional().nullable(),
  memo: z.string().trim().max(1000).optional().nullable(),
  bank_account_id: idSchema.optional().nullable(),
  currency: z.string().trim().length(3).default("INR"),
  exchange_rate: z.coerce.number().positive().default(1)
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: bill, error: billError } = await auth.context.supabase
    .from("bills")
    .select("id, contact_id, balance_due, status")
    .eq("org_id", auth.context.orgId)
    .eq("id", params.id)
    .single();

  if (billError || !bill) return fail(404, { code: "NOT_FOUND", message: "Bill not found." });
  if (bill.status === "void") return fail(409, { code: "VOID_BILL", message: "Void bills cannot be paid." });

  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    json = {};
  }

  const parsed = recordPaymentSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The payment payload is invalid.", details: parsed.error.flatten() });
  }

  if (parsed.data.amount > Number(bill.balance_due ?? 0)) {
    return fail(422, { code: "AMOUNT_EXCEEDS_BALANCE", message: "Payment amount cannot exceed bill balance due." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.payment_date, "all");
  if (lockResponse) return lockResponse;

  try {
    const payment = await createPaymentTransaction(auth.context, {
      contact_id: String(bill.contact_id),
      payment_type: "made",
      payment_date: parsed.data.payment_date,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      exchange_rate: parsed.data.exchange_rate,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      memo: parsed.data.memo ?? `Bill payment for ${params.id}`,
      status: "posted",
      bill_id: params.id,
      bank_account_id: parsed.data.bank_account_id ?? null
    });

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      entity_type: "payment",
      entity_id: payment.id,
      action: "record_bill_payment",
      new_values: { bill_id: params.id, amount: parsed.data.amount } as Json
    });

    return ok(payment, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "PAYMENT_FAILED", message: error instanceof Error ? error.message : "Payment could not be recorded." });
  }
}
