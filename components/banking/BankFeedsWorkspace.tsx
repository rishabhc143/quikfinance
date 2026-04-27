"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type BankAccountOption = {
  id: string;
  name: string;
  institution_name?: string | null;
  current_balance?: number;
  is_active?: boolean;
};

type FeedRow = {
  id: string;
  bank_account_id: string | null;
  bank_account_name: string;
  feed_name: string;
  source_type: string;
  imported_on: string;
  statement_date: string;
  opening_balance: number;
  closing_balance: number;
  line_count: number;
  currency: string;
  status: string;
  notes?: string | null;
};

type ExceptionRow = {
  id: string;
  bank_account_id: string;
  bank_account_name: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference: string | null;
  status: string;
};

type OverviewPayload = {
  summary: {
    active_bank_accounts: number;
    pending_feeds: number;
    unreconciled_lines: number;
    matched_lines: number;
  };
  bank_accounts: BankAccountOption[];
  feeds: FeedRow[];
  recent_exceptions: ExceptionRow[];
};

async function readOverview() {
  const response = await fetch("/api/v1/bank-feeds/overview", { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { data?: OverviewPayload; error?: { message?: string } };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Bank feeds could not be loaded.");
  }
  return payload.data;
}

export function BankFeedsWorkspace() {
  const queryClient = useQueryClient();
  const [bankAccountId, setBankAccountId] = useState("");
  const [feedName, setFeedName] = useState("");
  const [importedOn, setImportedOn] = useState(todayISO());
  const [statementDate, setStatementDate] = useState(todayISO());
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [currency, setCurrency] = useState("INR");
  const [sourceType, setSourceType] = useState<"upload" | "manual" | "api">("upload");
  const [notes, setNotes] = useState("");
  const [payloadText, setPayloadText] = useState("");

  const overview = useQuery({
    queryKey: ["bank-feeds-overview"],
    queryFn: readOverview
  });

  const selectedBank = useMemo(
    () => (overview.data?.bank_accounts ?? []).find((row) => row.id === bankAccountId) ?? null,
    [bankAccountId, overview.data?.bank_accounts]
  );

  const importFeed = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/bank-feeds/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: bankAccountId,
          feed_name: feedName || `${selectedBank?.name ?? "Bank"} statement ${statementDate}`,
          source_type: sourceType,
          imported_on: importedOn,
          statement_date: statementDate,
          opening_balance: Number(openingBalance),
          closing_balance: Number(closingBalance),
          currency,
          notes: notes || null,
          payload_text: payloadText
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Bank feed could not be imported.");
      }
    },
    onSuccess: async () => {
      toast.success("Bank feed imported.");
      setFeedName("");
      setOpeningBalance("0");
      setClosingBalance("0");
      setNotes("");
      setPayloadText("");
      await queryClient.invalidateQueries({ queryKey: ["bank-feeds-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bank feed could not be imported.")
  });

  const data = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Feeds"
        description="Import statement lines, route unmatched entries into reconciliation, and keep treasury exceptions visible."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active bank accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.active_bank_accounts ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending feeds</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.pending_feeds ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Unreconciled lines</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.unreconciled_lines ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Matched lines</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.matched_lines ?? 0}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Import statement feed</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="bank-account">Bank account</Label>
              <select id="bank-account" value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Select bank account</option>
                {(data?.bank_accounts ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="feed-name">Feed name</Label>
              <Input id="feed-name" value={feedName} onChange={(event) => setFeedName(event.target.value)} className="mt-2" placeholder="HDFC April statement" />
            </div>
            <div>
              <Label htmlFor="imported-on">Imported on</Label>
              <Input id="imported-on" type="date" value={importedOn} onChange={(event) => setImportedOn(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="statement-date">Statement date</Label>
              <Input id="statement-date" type="date" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="opening-balance">Opening balance</Label>
              <Input id="opening-balance" type="number" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="closing-balance">Closing balance</Label>
              <Input id="closing-balance" type="number" step="0.01" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="source-type">Source</Label>
              <select id="source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value as "upload" | "manual" | "api")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="upload">upload</option>
                <option value="manual">manual</option>
                <option value="api">api</option>
              </select>
            </div>
            <div>
              <Label htmlFor="feed-currency">Currency</Label>
              <select id="feed-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="feed-notes">Feed notes</Label>
              <Textarea id="feed-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" placeholder="Source file, operator note, or statement context." />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="payload-text">Statement payload</Label>
              <Textarea
                id="payload-text"
                rows={10}
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                className="mt-2 font-mono text-xs"
                placeholder={"date,description,amount,reference\n2026-04-01,Customer receipt,5000,UTR123\n2026-04-02,Vendor payout,-1800,NEFT87"}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={() => importFeed.mutate()} disabled={importFeed.isPending || !bankAccountId || !payloadText.trim()}>
                {importFeed.isPending ? "Importing..." : "Import feed"}
              </Button>
              <Button asChild variant="secondary"><Link href={bankAccountId ? `/bank-accounts/${bankAccountId}` : "/bank-accounts"}>Open bank account</Link></Button>
              <Button asChild variant="secondary"><Link href={bankAccountId ? `/bank-accounts/${bankAccountId}/reconciliation` : "/bank-accounts"}>Open reconciliation</Link></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exception handling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl bg-muted/40 p-3">Import statement lines here first. Then use reconciliation to match receipts and payouts against posted payments.</div>
            <div className="rounded-xl bg-muted/40 p-3">Imported lines stay in pending review until operations teams match, ignore, or reconcile them.</div>
            <div className="rounded-xl bg-muted/40 p-3">If a bank account is not selected, this page remains a queue monitor only. Select an account to open its statement history or reconciliation workspace.</div>
            {selectedBank ? (
              <div className="rounded-xl border bg-background p-4">
                <div className="font-medium">{selectedBank.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{selectedBank.institution_name ?? "Bank account"} - balance {formatMoney(Number(selectedBank.current_balance ?? 0))}</div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/bank-accounts">Bank accounts</Link></Button>
              <Button asChild variant="secondary"><Link href="/exception-queue">Exception queue</Link></Button>
              <Button asChild variant="secondary"><Link href="/audit-trail">Audit trail</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Recent feeds</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading bank feeds...</div> : null}
            {overview.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(overview.error as Error).message}</div> : null}
            {!overview.isLoading && !overview.isError && (data?.feeds ?? []).length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No bank feeds imported yet.</div> : null}
            {(data?.feeds ?? []).map((feed) => (
              <div key={feed.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{feed.feed_name}</div>
                    <div className="text-sm text-muted-foreground">{feed.bank_account_name} - imported {feed.imported_on} - statement {feed.statement_date}</div>
                    <div className="text-sm text-muted-foreground">{feed.source_type} - {feed.line_count} lines</div>
                    {feed.notes ? <div className="text-sm">{feed.notes}</div> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-medium">{formatMoney(Number(feed.closing_balance ?? 0))}</div>
                    <StatusBadge status={feed.status} />
                    {feed.bank_account_id ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild variant="ghost"><Link href={`/bank-accounts/${feed.bank_account_id}`}>Account</Link></Button>
                        <Button asChild variant="ghost"><Link href={`/bank-accounts/${feed.bank_account_id}/reconciliation`}>Reconcile</Link></Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent unreconciled lines</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading exceptions...</div> : null}
            {!overview.isLoading && !overview.isError && (data?.recent_exceptions ?? []).length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No unreconciled lines at the moment.</div> : null}
            {(data?.recent_exceptions ?? []).map((row) => (
              <div key={row.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{row.description}</div>
                    <div className="text-sm text-muted-foreground">{row.bank_account_name} - {row.transaction_date}</div>
                    <div className="text-sm text-muted-foreground">{row.reference ?? "No reference"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-medium">{formatMoney(row.amount)}</div>
                    <StatusBadge status={row.status} />
                    <Button asChild variant="ghost"><Link href={`/bank-accounts/${row.bank_account_id}/reconciliation`}>Resolve</Link></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
