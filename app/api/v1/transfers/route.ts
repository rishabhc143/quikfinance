import { z } from "zod";
import { canWriteData, requireApiContext, type ApiContext } from "@/lib/api/auth";
import { createInternalTransferTransaction } from "@/lib/accounting/transactions";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

const transferCreateSchema = z.object({
  source_bank_account_id: z.string().uuid(),
  destination_bank_account_id: z.string().uuid(),
  transfer_date: z.string().min(8),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(80).optional().nullable(),
  memo: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["draft", "posted"]).default("posted")
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
  created_at?: string;
};

function parsePaging(url: URL) {
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const perPage = Math.min(Math.max(Number(url.searchParams.get("per_page") ?? "25"), 1), 100);
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

async function loadBankMap(context: ApiContext, ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; institution_name: string | null }>();
  const { data } = await context.supabase
    .from("bank_accounts")
    .select("id, name, institution_name")
    .eq("org_id", context.orgId)
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((row) => [String(row.id), { name: String(row.name ?? "Bank account"), institution_name: typeof row.institution_name === "string" ? row.institution_name : null }]));
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

function normalizeSnapshot(record: { entity_id: string | null; created_at: string; new_values: Json }): TransferSnapshot | null {
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
    created_at: record.created_at
  };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");
  const { page, perPage, from, to } = parsePaging(url);

  const { data, error } = await auth.context.supabase
    .from("audit_logs")
    .select("entity_id, action, new_values, created_at")
    .eq("org_id", auth.context.orgId)
    .eq("entity_type", "internal_transfer")
    .order("created_at", { ascending: false });

  if (error) {
    return fail(400, { code: "LIST_FAILED", message: error.message });
  }

  const latestByEntity = new Map<string, TransferSnapshot>();
  for (const row of data ?? []) {
    const snapshot = normalizeSnapshot(row);
    if (!snapshot || latestByEntity.has(snapshot.id)) continue;
    latestByEntity.set(snapshot.id, snapshot);
  }

  let rows = [...latestByEntity.values()];
  if (status && ["draft", "posted", "cancelled"].includes(status)) {
    rows = rows.filter((row) => row.status === status);
  }
  if (search) {
    const lowered = search.toLowerCase();
    rows = rows.filter((row) =>
      [row.reference ?? "", row.memo ?? "", row.transfer_date, row.id].join(" ").toLowerCase().includes(lowered)
    );
  }

  const bankMap = await loadBankMap(
    auth.context,
    rows.flatMap((row) => [row.source_bank_account_id, row.destination_bank_account_id])
  );

  const paged = rows.slice(from, to + 1).map((row) => ({
    ...row,
    source_bank_name: bankMap.get(row.source_bank_account_id)?.name ?? "Source account",
    destination_bank_name: bankMap.get(row.destination_bank_account_id)?.name ?? "Destination account"
  }));

  return ok(paged, { total: rows.length, page, per_page: perPage });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });
  if (!canWriteData(auth.context.role)) {
    return fail(403, { code: "READ_ONLY_ROLE", message: "Your role has read-only access." });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = transferCreateSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Transfer payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.transfer_date, "banking");
  if (lockResponse) return lockResponse;

  try {
    const transfer = await createInternalTransferTransaction(auth.context, parsed.data);
    await audit(auth.context, "create", String(transfer.id), transfer as unknown as Json);
    return ok(transfer, undefined, { status: 201 });
  } catch (error) {
    return fail(400, { code: "CREATE_FAILED", message: error instanceof Error ? error.message : "Transfer could not be created." });
  }
}
