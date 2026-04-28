import { requireApiContext, type ApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import { journalEntrySchema } from "@/lib/validations/operations.schema";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

type JournalLine = {
  account_id: string;
  description?: string | null;
  debit: number;
  credit: number;
};

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

async function parseJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeLines(value: unknown) {
  if (!Array.isArray(value)) return [] as JournalLine[];
  return value
    .filter((line): line is Record<string, unknown> => typeof line === "object" && line !== null && !Array.isArray(line))
    .map((line) => ({
      account_id: String(line.account_id ?? ""),
      description: typeof line.description === "string" ? line.description : null,
      debit: Number(line.debit ?? 0),
      credit: Number(line.credit ?? 0)
    }));
}

function validateLines(lines: JournalLine[]) {
  const filtered = lines.filter((line) => line.account_id && (line.debit > 0 || line.credit > 0));
  if (filtered.length < 2) {
    throw new Error("Add at least two journal lines.");
  }
  for (const line of filtered) {
    if (line.debit > 0 && line.credit > 0) {
      throw new Error("A journal line cannot have both debit and credit.");
    }
  }
  const debits = toMoney(filtered.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
  const credits = toMoney(filtered.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
  if (debits !== credits) {
    throw new Error("Journal entry is not balanced.");
  }
  return { lines: filtered, debits, credits };
}

async function applyBalanceDelta(context: ApiContext, lines: JournalLine[]) {
  const byAccount = new Map<string, number>();
  for (const line of lines) {
    const delta = toMoney(Number(line.debit ?? 0) - Number(line.credit ?? 0));
    byAccount.set(line.account_id, toMoney((byAccount.get(line.account_id) ?? 0) + delta));
  }

  for (const [accountId, delta] of byAccount.entries()) {
    const { data: account, error } = await context.supabase.from("accounts").select("balance").eq("org_id", context.orgId).eq("id", accountId).single();
    if (error) throw new Error(error.message);
    const nextBalance = toMoney(Number(account?.balance ?? 0) + delta);
    const { error: updateError } = await context.supabase.from("accounts").update({ balance: nextBalance }).eq("org_id", context.orgId).eq("id", accountId);
    if (updateError) throw new Error(updateError.message);
  }
}

async function loadEntry(auth: { context: ApiContext }, id: string) {
  return auth.context.supabase.from("journal_entries").select("*").eq("org_id", auth.context.orgId).eq("id", id).single();
}

async function audit(context: ApiContext, action: string, entityId: string, values: Json) {
  await context.supabase.from("audit_logs").insert({
    org_id: context.orgId,
    user_id: context.userId,
    entity_type: "journal_entry",
    entity_id: entityId,
    action,
    new_values: values
  });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: journalEntry, error } = await loadEntry(auth, params.id);
  if (error || !journalEntry) return fail(404, { code: "NOT_FOUND", message: "Journal entry not found." });

  const { data: lines, error: lineError } = await auth.context.supabase
    .from("journal_entry_lines")
    .select("id, account_id, description, debit, credit, display_order, accounts:account_id(code, name)")
    .eq("org_id", auth.context.orgId)
    .eq("journal_entry_id", params.id)
    .order("display_order", { ascending: true });
  if (lineError) return fail(400, { code: "LINES_FAILED", message: lineError.message });

  const debits = toMoney((lines ?? []).reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
  const credits = toMoney((lines ?? []).reduce((sum, line) => sum + Number(line.credit ?? 0), 0));

  return ok({
    ...journalEntry,
    debits,
    credits,
    line_items: (lines ?? []).map((line) => {
      const accounts = line.accounts as { name?: string | null; code?: string | null } | Array<{ name?: string | null; code?: string | null }> | null;
      const accountRow = Array.isArray(accounts) ? accounts[0] : accounts;
      return {
        id: line.id,
        account_id: line.account_id,
        description: line.description,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        account_name: accountRow?.name ?? null,
        account_code: accountRow?.code ?? null
      };
    })
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await loadEntry(auth, params.id);
  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Journal entry not found." });
  if (String(existing.status) === "posted") {
    return fail(409, { code: "EDIT_NOT_ALLOWED", message: "Posted journal entries cannot be edited." });
  }
  if (existing.source_type && existing.source_type !== "manual") {
    return fail(409, { code: "EDIT_NOT_ALLOWED", message: "System-generated journal entries cannot be edited here." });
  }

  const json = await parseJson(request);
  const merged = { ...existing, ...json };
  const parsed = journalEntrySchema.safeParse(merged);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "The journal entry payload is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.entry_date, "journals");
  if (lockResponse) return lockResponse;

  try {
    const { lines, debits, credits } = validateLines(normalizeLines(json.line_items));
    const status = parsed.data.status;
    const isPosted = status === "posted";
    const isApproved = status === "approved" || status === "posted";

    const { data: journalEntry, error } = await auth.context.supabase
      .from("journal_entries")
      .update({
        entry_number: parsed.data.entry_number?.trim() || existing.entry_number,
        entry_date: parsed.data.entry_date,
        status,
        memo: parsed.data.memo ?? null,
        source_type: parsed.data.source_type ?? existing.source_type ?? "manual",
        source_id: parsed.data.source_id ?? existing.source_id ?? null,
        approved_by: isApproved ? auth.context.userId : null,
        posted_by: isPosted ? auth.context.userId : null,
        approved_at: isApproved ? new Date().toISOString() : null,
        posted_at: isPosted ? new Date().toISOString() : null
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error || !journalEntry) throw new Error(error?.message ?? "Journal entry could not be updated.");

    const { error: deleteError } = await auth.context.supabase.from("journal_entry_lines").delete().eq("org_id", auth.context.orgId).eq("journal_entry_id", params.id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: lineError } = await auth.context.supabase.from("journal_entry_lines").insert(
      lines.map((line, index) => ({
        org_id: auth.context.orgId,
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        description: line.description ?? null,
        debit: toMoney(line.debit),
        credit: toMoney(line.credit),
        display_order: index + 1
      }))
    );
    if (lineError) throw new Error(lineError.message);

    if (isPosted) {
      await applyBalanceDelta(auth.context, lines);
    }

    await audit(auth.context, "update", params.id, { ...parsed.data, line_items: lines, debits, credits } as Json);
    return ok({ ...journalEntry, debits, credits });
  } catch (error) {
    return fail(400, { code: "UPDATE_FAILED", message: error instanceof Error ? error.message : "Journal entry could not be updated." });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) return fail(auth.status, { code: auth.code, message: auth.message });

  const { data: existing, error: existingError } = await loadEntry(auth, params.id);
  if (existingError || !existing) return fail(404, { code: "NOT_FOUND", message: "Journal entry not found." });
  if (String(existing.status) === "posted") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "Posted journal entries cannot be deleted." });
  }
  if (existing.source_type && existing.source_type !== "manual") {
    return fail(409, { code: "DELETE_NOT_ALLOWED", message: "System-generated journal entries cannot be deleted here." });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, String(existing.entry_date), "journals");
  if (lockResponse) return lockResponse;

  const { error } = await auth.context.supabase.from("journal_entries").delete().eq("org_id", auth.context.orgId).eq("id", params.id);
  if (error) return fail(400, { code: "DELETE_FAILED", message: error.message });

  await audit(auth.context, "delete", params.id, { id: params.id } as Json);
  return ok({ id: params.id });
}
