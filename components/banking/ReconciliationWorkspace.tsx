"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";

type Suggestion = {
  payment_id: string;
  journal_entry_id: string | null;
  payment_date: string;
  amount: number;
  method: string;
  reference: string | null;
  contact_name: string | null;
  score: number;
  reason: string;
};

type Row = {
  id: string;
  statement_date: string;
  description: string;
  reference: string | null;
  statement_amount: number;
  book_amount: number;
  status: string;
  matched_journal_entry_id: string | null;
  matched_payment: {
    id: string;
    payment_date: string;
    amount: number;
    method: string;
    reference: string | null;
    contact_name: string | null;
  } | null;
  suggestions: Suggestion[];
};

type ReconciliationPayload = {
  bank_account?: { id: string; name: string; institution_name: string | null } | null;
  summary: {
    statement_balance: number;
    book_balance: number;
    difference: number;
    last_reconciled_at: string | null;
    matched_count: number;
    unmatched_count: number;
    suggestion_count: number;
  };
  rows: Row[];
  recent_reconciliations: Array<{
    id: string;
    statement_start: string;
    statement_end: string;
    statement_balance: number;
    book_balance: number;
    difference: number;
    status: string;
    created_at: string;
  }>;
};

async function parseResponse(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message ?? fallback);
  }
  return payload;
}

export function ReconciliationWorkspace({ bankAccountId }: { bankAccountId: string }) {
  const [payloadText, setPayloadText] = useState("");
  const [statementStart, setStatementStart] = useState("2026-04-01");
  const [statementEnd, setStatementEnd] = useState("2026-04-30");
  const [statementBalance, setStatementBalance] = useState("0");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reconciliation = useQuery({
    queryKey: ["reconciliation", bankAccountId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/reconciliation?bank_account_id=${bankAccountId}`);
      const payload = await parseResponse(response, "Bank reconciliation could not be loaded.");
      return payload.data as ReconciliationPayload;
    }
  });

  const submitImport = async () => {
    if (!payloadText.trim()) {
      toast.error("Paste a statement CSV or JSON export first.");
      return;
    }

    const response = await fetch("/api/v1/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import_statement",
        bank_account_id: bankAccountId,
        payload_text: payloadText
      })
    });

    try {
      const payload = await parseResponse(response, "Statement import failed.");
      setPayloadText("");
      toast.success(`Statement imported. ${payload.meta?.imported ?? 0} rows processed.`);
      reconciliation.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Statement import failed.");
    }
  };

  const submitReconciliation = async () => {
    const response = await fetch("/api/v1/reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reconcile",
        bank_account_id: bankAccountId,
        statement_start: statementStart,
        statement_end: statementEnd,
        statement_balance: Number(statementBalance)
      })
    });

    try {
      await parseResponse(response, "Reconciliation could not be saved.");
      toast.success("Reconciliation saved.");
      reconciliation.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconciliation could not be saved.");
    }
  };

  const updateTransaction = async (body: Record<string, unknown>, successMessage: string, busy: string) => {
    setBusyId(busy);
    try {
      const response = await fetch("/api/v1/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      await parseResponse(response, "Reconciliation action failed.");
      toast.success(successMessage);
      reconciliation.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconciliation action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const data = reconciliation.data;
  const unmatchedRows = useMemo(() => (data?.rows ?? []).filter((row) => row.status === "imported"), [data?.rows]);
  const matchedRows = useMemo(() => (data?.rows ?? []).filter((row) => row.status === "matched" || row.status === "reconciled"), [data?.rows]);
  const suggestionRows = useMemo(() => unmatchedRows.filter((row) => row.suggestions.length > 0), [unmatchedRows]);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Bank reconciliation"
        description={`Import statements, auto-match posted receipts and payouts, then close the period for ${data?.bank_account?.name ?? bankAccountId}.`}
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardTitle>Statement balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(data?.summary.statement_balance ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Book balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(data?.summary.book_balance ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Difference</CardTitle></CardHeader><CardContent className={data && data.summary.difference === 0 ? "text-2xl font-bold text-emerald-600" : "text-2xl font-bold text-amber-600"}>{formatMoney(data?.summary.difference ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Matched</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.matched_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Unmatched</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.unmatched_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Suggestions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.suggestion_count ?? 0}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Import statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="statement-payload">Paste CSV or JSON export</Label>
            <Textarea
              id="statement-payload"
              rows={10}
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              placeholder={"date,description,amount,reference\n2026-04-20,Northstar ACH,4000,ACH-4000"}
            />
            <Button onClick={submitImport}>Import statement</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Close reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="statement-start">Statement start</Label>
              <Input id="statement-start" type="date" value={statementStart} onChange={(event) => setStatementStart(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="statement-end">Statement end</Label>
              <Input id="statement-end" type="date" value={statementEnd} onChange={(event) => setStatementEnd(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="statement-balance">Statement closing / movement balance</Label>
              <Input id="statement-balance" type="number" step="0.01" value={statementBalance} onChange={(event) => setStatementBalance(event.target.value)} />
            </div>
            <Button variant="secondary" onClick={submitReconciliation}>
              Save reconciliation
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auto-match suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestionRows.length === 0 ? <p className="text-sm text-muted-foreground">No high-confidence suggestions yet.</p> : null}
          {suggestionRows.map((row) => (
            <div key={row.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-semibold">{row.description}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{row.statement_date} · {row.reference ?? "No reference"} · {formatMoney(row.statement_amount)}</div>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-4 grid gap-3">
                {row.suggestions.map((suggestion) => (
                  <div key={suggestion.payment_id} className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{suggestion.contact_name ?? "Payment candidate"} · {formatMoney(suggestion.amount)}</div>
                      <div className="text-muted-foreground">{suggestion.payment_date} · {suggestion.method} · {suggestion.reference ?? "No reference"} · {suggestion.reason}</div>
                    </div>
                    <Button
                      onClick={() =>
                        updateTransaction(
                          { action: "apply_match", bank_account_id: bankAccountId, transaction_id: row.id, payment_id: suggestion.payment_id },
                          "Match applied.",
                          `match:${row.id}:${suggestion.payment_id}`
                        )
                      }
                      disabled={busyId === `match:${row.id}:${suggestion.payment_id}`}
                    >
                      {busyId === `match:${row.id}:${suggestion.payment_id}` ? "Matching..." : "Match"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Matched lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedRows.length === 0 ? <p className="text-sm text-muted-foreground">No matched statement lines yet.</p> : null}
            {matchedRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.description}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.statement_date} · {formatMoney(row.statement_amount)}</div>
                    {row.matched_payment ? (
                      <div className="mt-2 text-sm">
                        Matched to {row.matched_payment.contact_name ?? "payment"} on {row.matched_payment.payment_date} for {formatMoney(row.matched_payment.amount)}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    {row.status !== "reconciled" ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          updateTransaction(
                            { action: "clear_match", bank_account_id: bankAccountId, transaction_id: row.id },
                            "Match cleared.",
                            `clear:${row.id}`
                          )
                        }
                        disabled={busyId === `clear:${row.id}`}
                      >
                        {busyId === `clear:${row.id}` ? "Clearing..." : "Clear"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unmatched lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unmatchedRows.length === 0 ? <p className="text-sm text-muted-foreground">All imported lines are either ignored or matched.</p> : null}
            {unmatchedRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.description}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{row.statement_date} · {row.reference ?? "No reference"} · {formatMoney(row.statement_amount)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        updateTransaction(
                          { action: "mark_status", bank_account_id: bankAccountId, transaction_ids: [row.id], status: "ignored" },
                          "Statement line ignored.",
                          `ignore:${row.id}`
                        )
                      }
                      disabled={busyId === `ignore:${row.id}`}
                    >
                      {busyId === `ignore:${row.id}` ? "Saving..." : "Ignore"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent reconciliations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.recent_reconciliations ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No saved reconciliation periods yet.</p> : null}
          {(data?.recent_reconciliations ?? []).map((reconciliationRow) => (
            <div key={reconciliationRow.id} className="grid gap-2 rounded-lg border p-4 text-sm md:grid-cols-5">
              <span>{reconciliationRow.statement_start}</span>
              <span>{reconciliationRow.statement_end}</span>
              <span>{formatMoney(reconciliationRow.statement_balance)}</span>
              <span>{formatMoney(reconciliationRow.difference)}</span>
              <span><StatusBadge status={reconciliationRow.status} /></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

