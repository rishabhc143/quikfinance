"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "asset_number", label: "Asset" },
  { key: "name", label: "Name" },
  { key: "purchase_date", label: "Purchase date", kind: "date" as const },
  { key: "purchase_cost", label: "Cost", kind: "money" as const, align: "right" as const },
  { key: "book_value", label: "Book value", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

export function FixedAssetsWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/fixed-assets", { signal, cache: "no-store" });
      const json = await response.json().catch(() => ({ data: [] }));
      const mapped = Array.isArray(json.data)
        ? json.data.map((asset: Record<string, unknown>) => ({
            ...asset,
            book_value: Math.max(0, Number(asset.purchase_cost ?? 0) - Number(asset.accumulated_depreciation ?? 0))
          }))
        : [];
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const cost = rows.reduce((sum, row) => sum + Number(row.purchase_cost ?? 0), 0);
    const book = rows.reduce((sum, row) => sum + Number(row.book_value ?? 0), 0);
    const active = rows.filter((row) => String(row.status ?? "") === "active").length;
    const depreciationDue = rows.filter((row) => String(row.status ?? "") === "active" && Number(row.book_value ?? 0) > Number(row.salvage_value ?? 0)).length;
    return { cost, book, active, depreciationDue };
  }, [rows]);

  const activeAssets = useMemo(
    () => rows.filter((row) => String(row.status ?? "") === "active").slice(0, 4),
    [rows]
  );

  const depreciate = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/v1/fixed-assets/${id}/depreciate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: 1 })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Depreciation could not be posted.");
      toast.success("Depreciation posted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Depreciation could not be posted.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Fixed Assets" description="Track capitalized assets, current book value, and depreciation readiness." actionLabel="New asset" actionHref="/fixed-assets/new" />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Total cost</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.cost)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Book value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.book)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Active assets</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.active}</CardContent></Card>
        <Card><CardHeader><CardTitle>Ready for depreciation</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.depreciationDue}</CardContent></Card>
      </div>
      {activeAssets.length ? (
        <Card>
          <CardHeader><CardTitle>Lifecycle actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeAssets.map((asset) => (
              <div key={String(asset.id)} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{String(asset.asset_number ?? "Asset")}</p>
                  <p className="text-sm text-muted-foreground">{String(asset.name ?? "")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Book value {formatMoney(Number(asset.book_value ?? 0))}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => depreciate(String(asset.id))} disabled={busyId === String(asset.id)}>
                    {busyId === String(asset.id) ? "Posting..." : "Post depreciation"}
                  </Button>
                  <Button asChild>
                    <a href={`/fixed-assets/${String(asset.id)}`}>Open</a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading fixed assets...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Fixed Assets" getRowHref={(row) => `/fixed-assets/${row.id}`} /> : <EmptyState title="No fixed assets yet" description="Create the first asset so depreciation and disposal tracking can start." actionLabel="New asset" actionHref="/fixed-assets/new" />}
    </div>
  );
}

