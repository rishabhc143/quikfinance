"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Account" },
  { key: "account_type", label: "Type", kind: "status" as const },
  { key: "currency", label: "Currency" },
  { key: "balance", label: "Balance", kind: "money" as const, align: "right" as const },
  { key: "is_system", label: "System", kind: "boolean" as const, align: "center" as const },
  { key: "is_active", label: "Active", kind: "boolean" as const, align: "center" as const }
];

const accountTypeOptions = [
  "cash",
  "bank",
  "accounts_receivable",
  "other_current_asset",
  "fixed_asset",
  "other_asset",
  "accounts_payable",
  "other_current_liability",
  "long_term_liability",
  "equity",
  "retained_earnings",
  "revenue",
  "cost_of_goods_sold",
  "expense",
  "other_income",
  "other_expense"
];

function headingForType(type: string) {
  if (["cash", "bank", "accounts_receivable", "other_current_asset", "fixed_asset", "other_asset"].includes(type)) return "Assets";
  if (["accounts_payable", "other_current_liability", "long_term_liability"].includes(type)) return "Liabilities";
  if (["equity", "retained_earnings"].includes(type)) return "Equity";
  if (["revenue", "other_income"].includes(type)) return "Income";
  return "Expenses";
}

export function ChartOfAccountsWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    account_type: "expense",
    currency: "INR",
    is_active: true,
    is_system: false
  });

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/accounts", { signal, cache: "no-store" });
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
    const totalBalance = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
    const active = rows.filter((row) => row.is_active !== false).length;
    const system = rows.filter((row) => row.is_system === true).length;
    return { totalBalance, active, system };
  }, [rows]);

  const grouped = useMemo(() => {
    const groups = new Map<string, TableRow[]>();
    for (const row of rows) {
      const key = headingForType(String(row.account_type ?? "expense"));
      const existing = groups.get(key) ?? [];
      existing.push(row);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [rows]);

  const createAccount = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, balance: 0 })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Account could not be created.");
      toast.success("Account created.");
      setForm({ code: "", name: "", account_type: "expense", currency: "INR", is_active: true, is_system: false });
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account could not be created.");
    } finally {
      setCreating(false);
    }
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/accounts/defaults", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Default accounts could not be created.");
      toast.success("Default accounts created.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Default accounts could not be created.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Chart of Accounts" description="Maintain the live account tree that powers journals, reports, and control balances." actionLabel={composerOpen ? "Hide form" : "New account"} actionHref={composerOpen ? "/chart-of-accounts" : "/chart-of-accounts/new"} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Active accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle>System accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.system}</CardContent></Card>
        <Card><CardHeader><CardTitle>Tracked balances</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(metrics.totalBalance)}</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Control actions</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? "Hide new account" : "Add account"}</Button>
            <Button onClick={seedDefaults} disabled={seeding}>{seeding ? "Seeding..." : "Seed defaults"}</Button>
          </div>
        </CardHeader>
        {composerOpen ? (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="account-code">Code</Label><Input id="account-code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} /></div>
            <div><Label htmlFor="account-name">Name</Label><Input id="account-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div>
              <Label htmlFor="account-type">Account type</Label>
              <select id="account-type" value={form.account_type} onChange={(event) => setForm((current) => ({ ...current, account_type: event.target.value }))} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {accountTypeOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
              </select>
            </div>
            <div><Label htmlFor="account-currency">Currency</Label><Input id="account-currency" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} /></div>
            <div className="flex items-center gap-2"><input id="account-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><Label htmlFor="account-active">Active</Label></div>
            <div className="flex items-center gap-2"><input id="account-system" type="checkbox" checked={form.is_system} onChange={(event) => setForm((current) => ({ ...current, is_system: event.target.checked }))} /><Label htmlFor="account-system">System account</Label></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={createAccount} disabled={creating || !form.code.trim() || !form.name.trim()}>{creating ? "Creating..." : "Create account"}</Button></div>
          </CardContent>
        ) : null}
      </Card>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading accounts...</div> : rows.length ? (
        <div className="space-y-6">
          <DataTable columns={columns} rows={rows} title="All Accounts" />
          {grouped.map(([group, groupRows]) => (
            <DataTable key={group} columns={columns} rows={groupRows} title={group} />
          ))}
        </div>
      ) : (
        <EmptyState title="No accounts yet" description="Create your first account or seed the default chart." actionLabel="Seed defaults" actionHref="/chart-of-accounts" />
      )}
    </div>
  );
}
