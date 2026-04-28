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

const columns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "symbol", label: "Symbol", align: "center" as const },
  { key: "decimal_places", label: "Decimals", kind: "number" as const, align: "right" as const }
];

export function CurrenciesWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", decimal_places: "2" });

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/currencies", { signal, cache: "no-store" });
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
    const total = rows.length;
    const uniqueDecimals = new Set(rows.map((row) => Number(row.decimal_places ?? 0))).size;
    const symbols = new Set(rows.map((row) => String(row.symbol ?? ""))).size;
    return { total, uniqueDecimals, symbols };
  }, [rows]);

  const createCurrency = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/v1/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          name: form.name,
          symbol: form.symbol,
          decimal_places: Number(form.decimal_places)
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Currency could not be created.");
      toast.success("Currency created.");
      setForm({ code: "", name: "", symbol: "", decimal_places: "2" });
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Currency could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Currencies" description="Manage enabled transaction currencies and decimal precision used across QuikFinance." actionLabel={composerOpen ? "Hide form" : "New currency"} actionHref={composerOpen ? "/settings/currencies" : "/settings/currencies/new"} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Enabled currencies</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader><CardTitle>Decimal schemes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.uniqueDecimals}</CardContent></Card>
        <Card><CardHeader><CardTitle>Unique symbols</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.symbols}</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Currency controls</CardTitle>
          <Button variant="secondary" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? "Hide new currency" : "Add currency"}</Button>
        </CardHeader>
        {composerOpen ? (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="currency-code">Code</Label><Input id="currency-code" value={form.code} maxLength={3} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
            <div><Label htmlFor="currency-name">Name</Label><Input id="currency-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div><Label htmlFor="currency-symbol">Symbol</Label><Input id="currency-symbol" value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} /></div>
            <div><Label htmlFor="currency-decimals">Decimal places</Label><Input id="currency-decimals" type="number" min="0" max="4" value={form.decimal_places} onChange={(event) => setForm((current) => ({ ...current, decimal_places: event.target.value }))} /></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={createCurrency} disabled={creating || !form.code.trim() || !form.name.trim() || !form.symbol.trim()}>{creating ? "Creating..." : "Create currency"}</Button></div>
          </CardContent>
        ) : null}
      </Card>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading currencies...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Currencies" /> : <EmptyState title="No currencies yet" description="Create the first currency to control transaction precision." actionLabel="New currency" actionHref="/settings/currencies/new" />}
    </div>
  );
}
