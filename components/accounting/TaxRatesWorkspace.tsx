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
  { key: "name", label: "Tax" },
  { key: "tax_type", label: "Type" },
  { key: "rate", label: "Rate", kind: "number" as const, align: "right" as const },
  { key: "is_compound", label: "Compound", kind: "boolean" as const, align: "center" as const },
  { key: "is_active", label: "Active", kind: "boolean" as const, align: "center" as const }
];

export function TaxRatesWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", rate: "18", tax_type: "GST", is_compound: false, is_active: true });

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/taxes", { signal, cache: "no-store" });
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
    const active = rows.filter((row) => row.is_active !== false).length;
    const gst = rows.filter((row) => String(row.tax_type ?? "").toUpperCase() === "GST").length;
    const highestRate = rows.reduce((max, row) => Math.max(max, Number(row.rate ?? 0)), 0);
    return { active, gst, highestRate };
  }, [rows]);

  const createTax = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/v1/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rate: Number(form.rate) })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Tax rate could not be created.");
      toast.success("Tax rate created.");
      setForm({ name: "", rate: "18", tax_type: "GST", is_compound: false, is_active: true });
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tax rate could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Taxes" description="Maintain GST and other tax rates used by invoices, bills, and compliance workflows." actionLabel={composerOpen ? "Hide form" : "New tax rate"} actionHref={composerOpen ? "/settings/taxes" : "/settings/taxes/new"} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Active rates</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle>GST rates</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.gst}</CardContent></Card>
        <Card><CardHeader><CardTitle>Highest rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.highestRate}%</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rate controls</CardTitle>
          <Button variant="secondary" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? "Hide new rate" : "Add tax rate"}</Button>
        </CardHeader>
        {composerOpen ? (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="tax-name">Tax name</Label><Input id="tax-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
            <div><Label htmlFor="tax-rate">Rate</Label><Input id="tax-rate" type="number" min="0" max="100" value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} /></div>
            <div><Label htmlFor="tax-type">Tax type</Label><Input id="tax-type" value={form.tax_type} onChange={(event) => setForm((current) => ({ ...current, tax_type: event.target.value }))} /></div>
            <div className="flex items-center gap-2"><input id="tax-compound" type="checkbox" checked={form.is_compound} onChange={(event) => setForm((current) => ({ ...current, is_compound: event.target.checked }))} /><Label htmlFor="tax-compound">Compound</Label></div>
            <div className="flex items-center gap-2"><input id="tax-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><Label htmlFor="tax-active">Active</Label></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={createTax} disabled={creating || !form.name.trim()}>{creating ? "Creating..." : "Create tax rate"}</Button></div>
          </CardContent>
        ) : null}
      </Card>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading tax rates...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Tax Rates" /> : <EmptyState title="No tax rates yet" description="Create a tax rate to start GST and tax calculations." actionLabel="Add tax rate" actionHref="/settings/taxes/new" />}
    </div>
  );
}
