import { z } from "zod";
import { canManageBanking, requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { processImportPayload } from "@/lib/imports/processors";
import { assertPeriodUnlocked } from "@/lib/period-locks";
import type { Json } from "@/types/database.types";

const bankFeedImportSchema = z.object({
  bank_account_id: z.string().uuid(),
  feed_name: z.string().trim().min(2).max(160),
  source_type: z.enum(["upload", "api", "manual"]).default("upload"),
  imported_on: z.string().min(8),
  statement_date: z.string().min(8),
  opening_balance: z.coerce.number().default(0),
  closing_balance: z.coerce.number().default(0),
  currency: z.string().trim().min(3).max(3).default("INR"),
  notes: z.string().max(1000).optional().nullable(),
  payload_text: z.string().min(4)
});

export const dynamic = "force-dynamic";

function mergeNotes(base: string | null | undefined, message: string) {
  const prefix = typeof base === "string" && base.trim() ? `${base.trim()}\n\n` : "";
  return `${prefix}${message}`;
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageBanking(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can import bank feeds." });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bankFeedImportSchema.safeParse(json);
  if (!parsed.success) {
    return fail(422, { code: "VALIDATION_FAILED", message: "Bank feed import is invalid.", details: parsed.error.flatten() });
  }

  const lockResponse = await assertPeriodUnlocked(auth.context, parsed.data.statement_date, "banking");
  if (lockResponse) return lockResponse;

  const { data: feed, error: createError } = await auth.context.supabase
    .from("bank_feeds")
    .insert({
      org_id: auth.context.orgId,
      bank_account_id: parsed.data.bank_account_id,
      feed_name: parsed.data.feed_name,
      source_type: parsed.data.source_type,
      imported_on: parsed.data.imported_on,
      statement_date: parsed.data.statement_date,
      opening_balance: parsed.data.opening_balance,
      closing_balance: parsed.data.closing_balance,
      line_count: 0,
      currency: parsed.data.currency,
      status: "processing",
      notes: parsed.data.notes ?? null,
      created_by: auth.context.userId
    })
    .select("*")
    .single();

  if (createError || !feed) {
    return fail(400, { code: "FEED_CREATE_FAILED", message: createError?.message ?? "Bank feed could not be created." });
  }

  try {
    const result = await processImportPayload(
      auth.context,
      "bank_statement",
      "bank_transactions",
      parsed.data.payload_text,
      parsed.data.bank_account_id
    );

    const status = result.failedRows > 0 ? "pending_review" : "pending_review";
    const notes = mergeNotes(parsed.data.notes, `Imported ${result.importedRows}/${result.totalRows} statement lines. Failed rows: ${result.failedRows}.`);

    const { data: updatedFeed, error: updateError } = await auth.context.supabase
      .from("bank_feeds")
      .update({
        line_count: result.totalRows,
        status,
        notes
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", feed.id)
      .select("*")
      .single();

    if (updateError || !updatedFeed) {
      return fail(400, { code: "FEED_UPDATE_FAILED", message: updateError?.message ?? "Bank feed import was saved but could not be finalized." });
    }

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      entity_type: "bank_feed",
      entity_id: updatedFeed.id,
      action: "import",
      new_values: {
        feed_name: updatedFeed.feed_name,
        bank_account_id: updatedFeed.bank_account_id,
        status: updatedFeed.status,
        line_count: updatedFeed.line_count
      } satisfies Json
    });

    return ok({ feed: updatedFeed, import_result: result }, undefined, { status: 201 });
  } catch (error) {
    await auth.context.supabase
      .from("bank_feeds")
      .update({
        status: "error",
        notes: mergeNotes(parsed.data.notes, error instanceof Error ? error.message : "Bank feed import failed.")
      })
      .eq("org_id", auth.context.orgId)
      .eq("id", feed.id);

    return fail(400, { code: "IMPORT_FAILED", message: error instanceof Error ? error.message : "Bank feed import failed." });
  }
}
