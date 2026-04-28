import { z } from "zod";
import { canManageBanking, requireApiContext, type ApiContext } from "@/lib/api/auth";
import { reverseInternalTransferTransaction } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

const reverseSchema = z.object({
  reversal_date: z.string().min(8).optional(),
  memo: z.string().trim().max(1000).optional().nullable()
});

type TransferSnapshot = {
  id: string;
  source_bank_account_id: string;
  destination_bank_account_id: string;
  transfer_date: string;
  amount: number;
  reference: string | null;
  memo: string | null;
  status: string;
  journal_entry_id: string | null;
  reversal_journal_entry_id?: string | null;
  reversal_date?: string | null;
  reversed_at?: string | null;
};

function normalizeSnapshot(record: { entity_id: string | null; new_values: Json }): TransferSnapshot | null {
  const payload = typeof record.new_values === "object" && record.new_values !== null && !Array.isArray(record.new_values)
    ? (record.new_values as Record<string, unknown>)
    : null;
  if (!payload || typeof record.entity_id !== "string") return null;
  return {
    id: record.entity_id,
    source_bank_account_id: String(payload.source_bank_account_id ?? ""),
    destination_bank_account_id: String(payload.destination_bank_account_id ?? ""),
    transfer_date: String(payload.transfer_date ?? ""),
    amount: Number(payload.amount ?? 0),
    reference: typeof payload.reference === "string" ? payload.reference : null,
    memo: typeof payload.memo === "string" ? payload.memo : null,
    status: String(payload.status ?? "draft"),
    journal_entry_id: typeof payload.journal_entry_id === "string" ? payload.journal_entry_id : null,
    reversal_journal_entry_id: typeof payload.reversal_journal_entry_id === "string" ? payload.reversal_journal_entry_id : null,
    reversal_date: typeof payload.reversal_date === "string" ? payload.reversal_date : null,
    reversed_at: typeof payload.reversed_at === "string" ? payload.reversed_at : null
  };
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "internal_transfer",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canManageBanking(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can reverse transfers." });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = reverseSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Transfer reversal is invalid.", details: parsed.error.flatten() });
  }

  const current = await auth.context.supabase
    .from("audit_logs")
    .select("entity_id, new_values, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("entity_type", "internal_transfer")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const snapshot = normalizeSnapshot((current.data ?? [])[0] ?? { entity_id: null, new_values: null });
  if (!snapshot) {
    return fail(404, { code: "NOT_FOUND", message: "Transfer was not found." });
  }
  if (snapshot.status !== "posted") {
    return fail(409, { code: "REVERSAL_NOT_ALLOWED", message: "Only posted transfers can be reversed." });
  }

  const reversalDate = parsed.data.reversal_date ?? new Date().toISOString().slice(0, 10);
  const lockResponse = await assertPeriodUnlocked(auth.context, reversalDate, "banking");
  if (lockResponse) return lockResponse;

  try {
    const reversal = await reverseInternalTransferTransaction(auth.context, {
      transfer_id: params.id,
      source_bank_account_id: snapshot.source_bank_account_id,
      destination_bank_account_id: snapshot.destination_bank_account_id,
      transfer_date: snapshot.transfer_date,
      amount: snapshot.amount,
      reference: snapshot.reference,
      memo: parsed.data.memo ?? snapshot.memo,
      reversal_date: reversalDate
    });

    const nextSnapshot = {
      ...snapshot,
      ...reversal
    };

    await audit(auth.context, "reverse", params.id, nextSnapshot as unknown as Json);
    return ok(nextSnapshot);
  } catch (error) {
    return fail(400, { code: "REVERSAL_FAILED", message: error instanceof Error ? error.message : "Transfer reversal failed." });
  }
}
