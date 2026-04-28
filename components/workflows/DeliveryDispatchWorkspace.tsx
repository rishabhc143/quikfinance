"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "dispatch_number", label: "Dispatch" },
  { key: "dispatch_date", label: "Date", kind: "date" as const },
  { key: "carrier_name", label: "Carrier" },
  { key: "tracking_number", label: "Tracking" },
  { key: "shipped_value", label: "Shipped value", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

export function DeliveryDispatchWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/delivery-dispatch", { signal: controller.signal, cache: "no-store" });
        const json = await response.json().catch(() => ({ data: [] }));
        setRows(Array.isArray(json.data) ? json.data : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const shipped = rows.reduce((sum, row) => sum + Number(row.shipped_value ?? 0), 0);
    const inTransit = rows.filter((row) => ["packed", "shipped"].includes(String(row.status ?? ""))).length;
    const delivered = rows.filter((row) => String(row.status ?? "") === "delivered").length;
    return { shipped, inTransit, delivered };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery / Dispatch" description="Track shipment release, carrier status, and proof-of-delivery progress for each dispatch." actionLabel="New dispatch" actionHref="/delivery-dispatch/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Shipped value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.shipped)}</CardContent></Card>
        <Card><CardHeader><CardTitle>In transit</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.inTransit}</CardContent></Card>
        <Card><CardHeader><CardTitle>Delivered</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.delivered}</CardContent></Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading dispatches...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Delivery / Dispatch" getRowHref={(row) => `/delivery-dispatch/${row.id}`} /> : <EmptyState title="No dispatches yet" description="Create the next dispatch to track fulfillment, shipping, and delivery proof." actionLabel="New dispatch" actionHref="/delivery-dispatch/new" />}
    </div>
  );
}
