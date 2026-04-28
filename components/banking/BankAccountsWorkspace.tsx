"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

export function BankAccountsWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    account_id: "",
    name: "",
    institution_name: "",
    account_number_last4: "",
    currency: "INR",
    current_balance: "0",
    is_active: true
  });

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/bank-accounts", { signal, cache: "no-store" });
      const json = await response.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const totalBalance = rows.reduce((sum, row) => sum + Number(row.current_balance ?? 0), 0);
    const active = rows.filter((row) => row.is_active !== false).length;
    const mapped = rows.filter((row) => Boolean(row.account_id)).length;
    const currencies = new Set(rows.map((row) => String(row.currency ?? ""))).size;
    return { totalBalance, active, mapped, currencies };
  }, [rows]);

  const createBankAccount = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/v1/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: form.account_id || null,
          name: form.name,
          institution_name: form.institution_name || null,
          account_number_last4: form.account_number_last4 || null,
          currency: form.currency,
          current_balance: Number(form.current_balance),
          is_active: form.is_active
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Bank account could not be created.");
      toast.success("Bank account created.");
      setForm({
        account_id: "",
        name: "",
        institution_name: "",
        account_number_last4: "",
        currency: "INR",
        current_balance: "0",
        is_active: true
      });
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bank account could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bank Accounts" description="Manage operational bank accounts, opening balances, and direct paths into reconciliation and payment controls." actionLabel={composerOpen ? "Hide form" : "New bank account"} actionHref={composerOpen ? "/bank-accounts" : "/bank-accounts/new"} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Tracked cash</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(metrics.totalBalance)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Ledger mapped</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.mapped}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Currencies used</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.currencies}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Banking controls</CardTitle>
            <p className="text-sm text-muted-foreground">Open reconciliation, import statements, and review payment operations from the right account context.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? "Hide new account" : "Add bank account"}</Button>
            <Button asChild variant="secondary"><Link href="/bank-feeds">Bank feeds</Link></Button>
            <Button asChild variant="secondary"><Link href="/payment-operations">Payment ops</Link></Button>
            <Button asChild variant="secondary"><Link href="/transfers">Transfers</Link></Button>
          </div>
        </CardHeader>
        {composerOpen ? (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="bank-account-id">Ledger account ID</Label><Input id="bank-account-id" value={form.account_id} onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))} /></div>
            <div><Label htmlFor="bank-name">Account name</Label><Input id="bank-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div><Label htmlFor="bank-institution">Institution</Label><Input id="bank-institution" value={form.institution_name} onChange={(event) => setForm((current) => ({ ...current, institution_name: event.target.value }))} /></div>
            <div><Label htmlFor="bank-last4">Last 4 digits</Label><Input id="bank-last4" maxLength={4} value={form.account_number_last4} onChange={(event) => setForm((current) => ({ ...current, account_number_last4: event.target.value }))} /></div>
            <div><Label htmlFor="bank-currency">Currency</Label><Input id="bank-currency" maxLength={3} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></div>
            <div><Label htmlFor="bank-balance">Current balance</Label><Input id="bank-balance" type="number" step="0.01" value={form.current_balance} onChange={(event) => setForm((current) => ({ ...current, current_balance: event.target.value }))} /></div>
            <div className="flex items-center gap-2"><input id="bank-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><Label htmlFor="bank-active">Active</Label></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={createBankAccount} disabled={creating || !form.name.trim()}>{creating ? "Creating..." : "Create bank account"}</Button></div>
          </CardContent>
        ) : null}
      </Card>

      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading bank accounts...</div> : null}
      {!loading && rows.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No bank accounts yet. Add the first account to start reconciliation and payment operations.</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => (
          <Card key={String(row.id)}>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{String(row.name ?? row.id)}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {String(row.institution_name ?? "Institution not set")}
                  {row.account_number_last4 ? ` · ending ${String(row.account_number_last4)}` : ""}
                  {row.currency ? ` · ${String(row.currency)}` : ""}
                </p>
              </div>
              <StatusBadge status={row.is_active === false ? "inactive" : "active"} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Current balance</div>
                  <div className="mt-2 text-xl font-semibold">{formatMoney(Number(row.current_balance ?? 0))}</div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Ledger mapping</div>
                  <div className="mt-2 text-sm font-medium">{row.account_id ? String(row.account_id) : "Not linked"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link href={`/bank-accounts/${String(row.id)}`}>Open account</Link></Button>
                <Button asChild variant="secondary"><Link href={`/bank-accounts/${String(row.id)}/reconciliation`}>Reconciliation</Link></Button>
                <Button asChild variant="secondary"><Link href={`/bank-accounts/new?edit=${String(row.id)}`}>Edit</Link></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
