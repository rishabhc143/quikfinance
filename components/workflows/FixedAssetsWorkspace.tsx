"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/fixed-assets", { signal: controller.signal, cache: "no-store" });
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
    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const cost = rows.reduce((sum, row) => sum + Number(row.purchase_cost ?? 0), 0);
    const book = rows.reduce((sum, row) => sum + Number(row.book_value ?? 0), 0);
    const active = rows.filter((row) => String(row.status ?? "") === "active").length;
    return { cost, book, active };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Fixed Assets" description="Track capitalized assets, current book value, and depreciation readiness." actionLabel="New asset" actionHref="/fixed-assets/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total cost</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.cost)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Book value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.book)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Active assets</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.active}</CardContent></Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading fixed assets...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Fixed Assets" getRowHref={(row) => `/fixed-assets/${row.id}`} /> : <EmptyState title="No fixed assets yet" description="Create the first asset so depreciation and disposal tracking can start." actionLabel="New asset" actionHref="/fixed-assets/new" />}
    </div>
  );
}
