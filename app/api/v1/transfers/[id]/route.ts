import { z } from "zod";
import { canWriteData, requireApiContext, type ApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import type { Json } from "@/types/database.types";

const statusSchema = z.object({
  status: z.enum(["draft", "posted", "cancelled", "reversed"])
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

type TransferHistoryEntry = {
  action: string;
  created_at: string;
  status: string;
  reference: string | null;
  memo: string | null;
  journal_entry_id: string | null;
  reversal_journal_entry_id?: string | null;
  reversal_date?: string | null;
  reversed_at?: string | null;
};

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

function historyEntryFromAudit(record: { action: string; created_at: string; new_values: Json; entity_id: string | null }): TransferHistoryEntry | null {
  const snapshot = normalizeSnapshot(record);
  if (!snapshot) return null;
  return {
    action: record.action,
    created_at: record.created_at,
    status: snapshot.status,
    reference: snapshot.reference,
    memo: snapshot.memo,
    journal_entry_id: snapshot.journal_entry_id,
    reversal_journal_entry_id: snapshot.reversal_journal_entry_id ?? null,
    reversal_date: snapshot.reversal_date ?? null,
    reversed_at: snapshot.reversed_at ?? null
  };
}

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data, error } = await auth.context.supabase
    .from("audit_logs")
    .select("entity_id, action, new_values, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("entity_type", "internal_transfer")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !(data ?? []).length) {
    return fail(404, { code: "NOT_FOUND", message: error?.message ?? "Transfer was not found." });
  }

  const snapshot = normalizeSnapshot(data![0]);
  if (!snapshot) {
    return fail(404, { code: "NOT_FOUND", message: "Transfer was not found." });
  }

  const history = (data ?? []).map((row) => historyEntryFromAudit(row)).filter((row): row is TransferHistoryEntry => row !== null);
  return ok({ ...snapshot, history });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = statusSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Transfer update is invalid.", details: parsed.error.flatten() });
  }

  const current = await auth.context.supabase
    .from("audit_logs")
    .select("entity_id, action, new_values, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("entity_type", "internal_transfer")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const snapshot = normalizeSnapshot((current.data ?? [])[0] ?? { entity_id: null, new_values: null });
  if (!snapshot) {
    return fail(404, { code: "NOT_FOUND", message: "Transfer was not found." });
  }
  if (parsed.data.status === "reversed") {
    return fail(409, { code: "USE_REVERSAL_ENDPOINT", message: "Use the transfer reversal action for posted transfers." });
  }
  if (snapshot.status === "posted" && parsed.data.status === "cancelled") {
    return fail(409, { code: "POSTED_TRANSFER_IMMUTABLE", message: "Posted transfers cannot be cancelled without a reversal entry." });
  }

  const nextSnapshot = { ...snapshot, status: parsed.data.status };
  await audit(auth.context, "update", params.id, nextSnapshot as unknown as Json);
  return ok(nextSnapshot);
}
