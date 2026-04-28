import { canManageBanking, requireApiContext } from "@/lib/api/auth";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { processImportPayload } from "@/lib/imports/processors";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function daysBetween(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().trim();
}

function paymentSignMatches(bankAmount: number, paymentType: string) {
  return (bankAmount >= 0 && paymentType === "received") || (bankAmount < 0 && paymentType === "made");
}

type ReconciliationAction =
  | {
      action: "import_statement";
      bank_account_id: string;
      payload_text: string;
    }
  | {
      action: "mark_status";
      bank_account_id: string;
      transaction_ids: string[];
      status: "matched" | "ignored" | "imported";
    }
  | {
      action: "apply_match";
      bank_account_id: string;
      transaction_id: string;
      payment_id: string;
    }
  | {
      action: "clear_match";
      bank_account_id: string;
      transaction_id: string;
    }
  | {
      action: "reconcile";
      bank_account_id: string;
      statement_start: string;
      statement_end: string;
      statement_balance: number;
    };

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { searchParams } = new URL(request.url);
  const bankAccountId = searchParams.get("bank_account_id");
  if (!bankAccountId) {
    return fail(422, { code: "BANK_ACCOUNT_REQUIRED", message: "Choose a bank account to continue." });
  }

  const [{ data: bankAccount, error: bankError }, { data: transactions, error: transactionError }, { data: reconciliations, error: reconciliationError }] =
    await Promise.all([
      auth.context.supabase
        .from("bank_accounts")
        .select("id, name, institution_name, current_balance, account_id")
        .eq("org_id", auth.context.orgId)
        .eq("id", bankAccountId)
        .single(),
      auth.context.supabase
        .from("bank_transactions")
        .select("id, transaction_date, description, amount, reference, status, matched_journal_entry_id, reconciliation_id")
        .eq("org_id", auth.context.orgId)
        .eq("bank_account_id", bankAccountId)
        .order("transaction_date", { ascending: false }),
      auth.context.supabase
        .from("reconciliations")
        .select("id, statement_start, statement_end, statement_balance, book_balance, difference, status, created_at")
        .eq("org_id", auth.context.orgId)
        .eq("bank_account_id", bankAccountId)
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

  if (bankError || transactionError || reconciliationError || !bankAccount) {
    return fail(500, {
      code: "RECONCILIATION_LOAD_FAILED",
      message: bankError?.message ?? transactionError?.message ?? reconciliationError?.message ?? "Bank reconciliation data could not be loaded."
    });
  }

  const paymentQuery = bankAccount.account_id
    ? await auth.context.supabase
        .from("payments")
        .select("id, payment_type, payment_date, amount, reference, method, journal_entry_id, contact_id, status")
        .eq("org_id", auth.context.orgId)
        .eq("status", "posted")
        .eq("deposit_account_id", bankAccount.account_id)
        .order("payment_date", { ascending: false })
        .limit(300)
    : { data: [], error: null };
  const payments = paymentQuery.data ?? [];
  const paymentError = paymentQuery.error;

  if (paymentError) {
    return fail(500, { code: "PAYMENT_LOAD_FAILED", message: paymentError.message });
  }

  const contactIds = [...new Set(payments.map((payment) => String(payment.contact_id)).filter((value) => value && value !== "null"))];
  const { data: contacts } = contactIds.length
    ? await auth.context.supabase.from("contacts").select("id, display_name").eq("org_id", auth.context.orgId).in("id", contactIds)
    : { data: [] as Array<{ id: string; display_name: string }> };
  const contactMap = new Map((contacts ?? []).map((contact) => [String(contact.id), String(contact.display_name)]));

  const paymentsByJournal = new Map(payments.filter((payment) => payment.journal_entry_id).map((payment) => [String(payment.journal_entry_id), payment]));

  const rows = (transactions ?? []).map((row) => {
    const bankAmount = Number(row.amount ?? 0);
    const descriptionText = `${normalize(row.description)} ${normalize(row.reference)}`;
    const candidates = payments
      .filter((payment) => paymentSignMatches(bankAmount, String(payment.payment_type)))
      .map((payment) => {
        const amount = Number(payment.amount ?? 0);
        const exactAmount = Math.abs(Math.abs(bankAmount) - amount) <= 0.01;
        const dateGap = daysBetween(String(row.transaction_date), String(payment.payment_date));
        const referenceHit = normalize(payment.reference) && descriptionText.includes(normalize(payment.reference));
        const score = (exactAmount ? 10 : Math.abs(Math.abs(bankAmount) - amount) <= 1 ? 4 : 0) + (dateGap <= 3 ? 3 : dateGap <= 7 ? 1 : 0) + (referenceHit ? 3 : 0);

        return {
          payment_id: String(payment.id),
          journal_entry_id: payment.journal_entry_id ? String(payment.journal_entry_id) : null,
          payment_date: String(payment.payment_date),
          amount,
          method: String(payment.method ?? ""),
          reference: typeof payment.reference === "string" ? payment.reference : null,
          contact_name: contactMap.get(String(payment.contact_id)) ?? null,
          score,
          reason: referenceHit ? "reference match" : exactAmount ? "exact amount" : "close amount/date"
        };
      })
      .filter((candidate) => candidate.score >= 5)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    const matchedPayment = row.matched_journal_entry_id ? paymentsByJournal.get(String(row.matched_journal_entry_id)) : null;

    return {
      id: String(row.id),
      statement_date: String(row.transaction_date),
      description: String(row.description),
      reference: typeof row.reference === "string" ? row.reference : null,
      statement_amount: bankAmount,
      book_amount: matchedPayment ? Number(matchedPayment.amount ?? 0) * (String(matchedPayment.payment_type) === "made" ? -1 : 1) : row.status === "ignored" ? 0 : bankAmount,
      status: String(row.status),
      matched_journal_entry_id: row.matched_journal_entry_id ? String(row.matched_journal_entry_id) : null,
      matched_payment: matchedPayment
        ? {
            id: String(matchedPayment.id),
            payment_date: String(matchedPayment.payment_date),
            amount: Number(matchedPayment.amount ?? 0),
            method: String(matchedPayment.method ?? ""),
            reference: typeof matchedPayment.reference === "string" ? matchedPayment.reference : null,
            contact_name: contactMap.get(String(matchedPayment.contact_id)) ?? null
          }
        : null,
      suggestions: candidates
    };
  });

  const statementBalance = rows.reduce((sum, row) => sum + Number(row.statement_amount ?? 0), 0);
  const bookBalance = typeof bankAccount.current_balance === "number" ? bankAccount.current_balance : Number(bankAccount.current_balance ?? 0);
  const latestReconciliation = (reconciliations ?? [])[0] ?? null;

  return ok({
    bank_account: bankAccount,
    summary: {
      statement_balance: statementBalance,
      book_balance: bookBalance,
      difference: Number((statementBalance - bookBalance).toFixed(2)),
      last_reconciled_at: latestReconciliation?.created_at ?? null,
      matched_count: rows.filter((row) => row.status === "matched" || row.status === "reconciled").length,
      unmatched_count: rows.filter((row) => row.status === "imported").length,
      suggestion_count: rows.filter((row) => row.status === "imported" && row.suggestions.length > 0).length
    },
    rows,
    recent_reconciliations: reconciliations ?? []
  });
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageBanking(auth.context.role)) {
    return fail(403, { code: "INSUFFICIENT_ROLE", message: "Only owners, admins, and accountants can reconcile bank activity." });
  }

  try {
    const body = (await request.json()) as ReconciliationAction;

    if (body.action === "import_statement") {
      const result = await processImportPayload(auth.context, "bank_statement", "bank_transactions", body.payload_text, body.bank_account_id);
      return ok(result, { imported: result.importedRows }, { status: 201 });
    }

    if (body.action === "mark_status") {
      if (!Array.isArray(body.transaction_ids) || body.transaction_ids.length === 0) {
        return fail(422, { code: "TRANSACTIONS_REQUIRED", message: "Select at least one transaction." });
      }

      const updatePayload =
        body.status === "imported"
          ? { status: body.status, matched_journal_entry_id: null, reconciliation_id: null }
          : { status: body.status };

      const { data, error } = await auth.context.supabase
        .from("bank_transactions")
        .update(updatePayload)
        .eq("org_id", auth.context.orgId)
        .eq("bank_account_id", body.bank_account_id)
        .in("id", body.transaction_ids)
        .select("id, status");

      if (error) {
        return fail(400, { code: "STATUS_UPDATE_FAILED", message: error.message });
      }

      return ok(data ?? []);
    }

    if (body.action === "apply_match") {
      const [{ data: bankAccount, error: bankError }, { data: transaction, error: transactionError }, { data: payment, error: paymentError }] = await Promise.all([
        auth.context.supabase
          .from("bank_accounts")
          .select("id, account_id")
          .eq("org_id", auth.context.orgId)
          .eq("id", body.bank_account_id)
          .single(),
        auth.context.supabase
          .from("bank_transactions")
          .select("id, amount, status")
          .eq("org_id", auth.context.orgId)
          .eq("bank_account_id", body.bank_account_id)
          .eq("id", body.transaction_id)
          .single(),
        auth.context.supabase
          .from("payments")
          .select("id, amount, payment_type, deposit_account_id, journal_entry_id")
          .eq("org_id", auth.context.orgId)
          .eq("id", body.payment_id)
          .single()
      ]);

      if (bankError || transactionError || paymentError || !bankAccount || !transaction || !payment) {
        return fail(404, { code: "MATCH_DATA_NOT_FOUND", message: "The transaction or payment could not be loaded." });
      }
      if (!bankAccount.account_id) {
        return fail(422, { code: "LEDGER_NOT_MAPPED", message: "This bank account is not mapped to a ledger account yet." });
      }

      if (!payment.journal_entry_id) {
        return fail(422, { code: "PAYMENT_NOT_POSTED", message: "Only posted payments can be matched." });
      }
      if (payment.deposit_account_id !== bankAccount.account_id) {
        return fail(422, { code: "ACCOUNT_MISMATCH", message: "The payment belongs to a different bank or cash ledger." });
      }
      if (!paymentSignMatches(Number(transaction.amount ?? 0), String(payment.payment_type))) {
        return fail(422, { code: "DIRECTION_MISMATCH", message: "Receipt and payout directions do not match." });
      }

      const { data: updated, error: updateError } = await auth.context.supabase
        .from("bank_transactions")
        .update({
          matched_journal_entry_id: payment.journal_entry_id,
          status: "matched"
        })
        .eq("org_id", auth.context.orgId)
        .eq("id", body.transaction_id)
        .select("id, matched_journal_entry_id, status")
        .single();

      if (updateError || !updated) {
        return fail(400, { code: "MATCH_FAILED", message: updateError?.message ?? "The match could not be saved." });
      }

      await auth.context.supabase.from("audit_logs").insert({
        org_id: auth.context.orgId,
        user_id: auth.context.userId,
        entity_type: "bank_transaction",
        entity_id: body.transaction_id,
        action: "match",
        new_values: {
          payment_id: body.payment_id,
          journal_entry_id: payment.journal_entry_id
        }
      });

      return ok(updated);
    }

    if (body.action === "clear_match") {
      const { data: updated, error } = await auth.context.supabase
        .from("bank_transactions")
        .update({
          matched_journal_entry_id: null,
          reconciliation_id: null,
          status: "imported"
        })
        .eq("org_id", auth.context.orgId)
        .eq("bank_account_id", body.bank_account_id)
        .eq("id", body.transaction_id)
        .select("id, status")
        .single();

      if (error || !updated) {
        return fail(400, { code: "CLEAR_MATCH_FAILED", message: error?.message ?? "The match could not be cleared." });
      }

      return ok(updated);
    }

    if (body.action === "reconcile") {
      const { data: rows, error: rowsError } = await auth.context.supabase
        .from("bank_transactions")
        .select("id, amount, status")
        .eq("org_id", auth.context.orgId)
        .eq("bank_account_id", body.bank_account_id)
        .gte("transaction_date", body.statement_start)
        .lte("transaction_date", body.statement_end)
        .neq("status", "ignored");

      if (rowsError) {
        return fail(400, { code: "RECONCILIATION_RANGE_FAILED", message: rowsError.message });
      }

      const bookBalance = Number((rows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(2));
      const difference = Number((body.statement_balance - bookBalance).toFixed(2));

      const { data: reconciliation, error: reconciliationError } = await auth.context.supabase
        .from("reconciliations")
        .insert({
          org_id: auth.context.orgId,
          bank_account_id: body.bank_account_id,
          statement_start: body.statement_start,
          statement_end: body.statement_end,
          statement_balance: body.statement_balance,
          book_balance: bookBalance,
          difference,
          status: difference === 0 ? "completed" : "open",
          completed_by: difference === 0 ? auth.context.userId : null,
          completed_at: difference === 0 ? new Date().toISOString() : null
        })
        .select("id, statement_start, statement_end, statement_balance, book_balance, difference, status")
        .single();

      if (reconciliationError || !reconciliation) {
        return fail(400, { code: "RECONCILIATION_CREATE_FAILED", message: reconciliationError?.message ?? "Reconciliation could not be created." });
      }

      if ((rows ?? []).length > 0) {
        await auth.context.supabase
          .from("bank_transactions")
          .update({
            reconciliation_id: reconciliation.id,
            status: difference === 0 ? "reconciled" : "matched"
          })
          .eq("org_id", auth.context.orgId)
          .eq("bank_account_id", body.bank_account_id)
          .gte("transaction_date", body.statement_start)
          .lte("transaction_date", body.statement_end)
          .neq("status", "ignored");
      }

      await auth.context.supabase.from("audit_logs").insert({
        org_id: auth.context.orgId,
        user_id: auth.context.userId,
        entity_type: "reconciliation",
        entity_id: reconciliation.id,
        action: "create",
        new_values: {
          statement_start: body.statement_start,
          statement_end: body.statement_end,
          statement_balance: body.statement_balance,
          book_balance: bookBalance,
          difference
        }
      });

      return ok({
        ...reconciliation,
        reconciled_at: difference === 0 ? new Date().toISOString() : todayIso()
      });
    }

    return fail(405, { code: "METHOD_NOT_ALLOWED", message: "Unsupported reconciliation action." });
  } catch (error) {
    return fail(500, { code: "RECONCILIATION_FAILED", message: errorMessage(error) });
  }
}
