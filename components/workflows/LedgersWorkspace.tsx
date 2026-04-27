"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/currency";

type AccountRecord = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  balance: number;
  is_active: boolean;
};

type JournalEntry = {
  id: string;
  entry_number: string | null;
  entry_date: string;
  memo: string | null;
  status: string;
  source_type: string | null;
};

type AuditRecord = {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  new_values: Record<string, unknown> | null;
};

async function readData<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? fallback);
  }
  return payload.data;
}

function prettifyAccountType(accountType: string) {
  return accountType.replaceAll("_", " ");
}

function readNote(record: AuditRecord) {
  const note = record.new_values?.note;
  return typeof note === "string" && note.trim().length > 0 ? note : "Ledger review logged.";
}

export function LedgersWorkspace() {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const accountsQuery = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/accounts?per_page=200", { cache: "no-store" });
      return readData<AccountRecord[]>(response, "Accounts could not be loaded.");
    }
  });

  const journalsQuery = useQuery({
    queryKey: ["ledger-journals"],
    queryFn: async () => {
      const response = await fetch("/api/v1/journal-entries?per_page=20", { cache: "no-store" });
      return readData<JournalEntry[]>(response, "Journal entries could not be loaded.");
    }
  });

  const auditQuery = useQuery({
    queryKey: ["ledger-audits"],
    queryFn: async () => {
      const response = await fetch("/api/audit-logs", { cache: "no-store" });
      return readData<AuditRecord[]>(response, "Ledger audit data could not be loaded.");
    }
  });

  const createReview = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          entity_type: "ledger_review",
          new_values: { note }
        })
      });
      await readData(response, "Ledger review could not be logged.");
    },
    onSuccess: async () => {
      setNote("");
      toast.success("Ledger review logged.");
      await queryClient.invalidateQueries({ queryKey: ["ledger-audits"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ledger review could not be logged.")
  });

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const journals = useMemo(() => journalsQuery.data ?? [], [journalsQuery.data]);
  const audits = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const reviewNotes = useMemo(
    () => audits.filter((record) => record.entity_type === "ledger_review" || (record.action === "review" && record.entity_type.includes("ledger"))),
    [audits]
  );
  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);
  const nonZeroAccounts = useMemo(() => accounts.filter((account) => Math.abs(Number(account.balance ?? 0)) > 0.009), [accounts]);
  const liquidityAccounts = useMemo(
    () => accounts.filter((account) => ["cash", "bank"].includes(account.account_type)),
    [accounts]
  );
  const liquidityBalance = useMemo(
    () => liquidityAccounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0),
    [liquidityAccounts]
  );
  const controlAccounts = useMemo(
    () => accounts.filter((account) => ["accounts_receivable", "accounts_payable", "cash", "bank"].includes(account.account_type)).slice(0, 6),
    [accounts]
  );
  const watchlist = useMemo(
    () => [...accounts].sort((left, right) => Math.abs(Number(right.balance ?? 0)) - Math.abs(Number(left.balance ?? 0))).slice(0, 8),
    [accounts]
  );
  const postedJournals = useMemo(() => journals.filter((entry) => entry.status === "posted").slice(0, 8), [journals]);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Ledgers"
        description="Review the chart of accounts, monitor control balances, and trace recent postings that changed ledger positions."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{activeAccounts.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Non-zero accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{nonZeroAccounts.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Liquidity balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(liquidityBalance)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Review notes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reviewNotes.length}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Ledger control review</CardTitle>
              <p className="text-sm text-muted-foreground">Leave a note after reviewing control accounts, unusual balances, and adjustment entries.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/chart-of-accounts">Chart of accounts</Link></Button>
              <Button asChild variant="secondary"><Link href="/journal-entries">Journal entries</Link></Button>
              <Button asChild><Link href="/chart-of-accounts/new">New account</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ledger-note">Review note</Label>
              <Input
                id="ledger-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Suspense reviewed. No unsupported balances remain."
              />
            </div>
            <Button onClick={() => createReview.mutate()} disabled={createReview.isPending || !note.trim()}>
              {createReview.isPending ? "Logging..." : "Log ledger review"}
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {controlAccounts.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No control accounts available yet.</div> : null}
              {controlAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground capitalize">{prettifyAccountType(account.account_type)}</div>
                  <div className="mt-1 font-medium">{account.name}</div>
                  <div className="mt-2 font-mono text-sm">{formatMoney(Number(account.balance ?? 0))}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledger watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountsQuery.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading accounts...</div> : null}
            {accountsQuery.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(accountsQuery.error as Error).message}</div> : null}
            {!accountsQuery.isLoading && !accountsQuery.isError && watchlist.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No ledger balances available yet.</div>
            ) : null}
            {watchlist.map((account) => (
              <div key={account.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{account.code} - {account.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{prettifyAccountType(account.account_type)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{formatMoney(Number(account.balance ?? 0))}</div>
                    <Badge tone={account.is_active ? "success" : "muted"}>{account.is_active ? "active" : "inactive"}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent posted journals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {journalsQuery.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading journals...</div> : null}
            {journalsQuery.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(journalsQuery.error as Error).message}</div> : null}
            {!journalsQuery.isLoading && !journalsQuery.isError && postedJournals.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No posted journal entries available yet.</div>
            ) : null}
            {postedJournals.map((entry) => (
              <div key={entry.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{entry.entry_number ?? entry.id}</div>
                    <div className="text-sm text-muted-foreground">{entry.entry_date} - {String(entry.source_type ?? "manual").replaceAll("_", " ")}</div>
                    <div className="text-sm">{entry.memo ?? "No memo provided."}</div>
                  </div>
                  <Badge tone="success">posted</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent ledger reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditQuery.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading review notes...</div> : null}
            {auditQuery.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(auditQuery.error as Error).message}</div> : null}
            {!auditQuery.isLoading && !auditQuery.isError && reviewNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No ledger reviews logged yet.</div>
            ) : null}
            {reviewNotes.slice(0, 8).map((record) => (
              <div key={record.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="warning">review</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-3 text-sm">{readNote(record)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
