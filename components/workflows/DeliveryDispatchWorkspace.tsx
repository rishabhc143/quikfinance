"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [salesOrders, setSalesOrders] = useState<TableRow[]>([]);
  const [eWayBills, setEWayBills] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [dispatchRes, salesOrderRes, eWayBillRes] = await Promise.all([
        fetch("/api/v1/delivery-dispatch", { signal, cache: "no-store" }),
        fetch("/api/v1/sales-orders", { signal, cache: "no-store" }),
        fetch("/api/v1/e-way-bills", { signal, cache: "no-store" })
      ]);
      const dispatchJson = await dispatchRes.json().catch(() => ({ data: [] }));
      const salesOrderJson = await salesOrderRes.json().catch(() => ({ data: [] }));
      const eWayBillJson = await eWayBillRes.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(dispatchJson.data) ? dispatchJson.data : []);
      setSalesOrders(Array.isArray(salesOrderJson.data) ? salesOrderJson.data : []);
      setEWayBills(Array.isArray(eWayBillJson.data) ? eWayBillJson.data : []);
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
    const shipped = rows.reduce((sum, row) => sum + Number(row.shipped_value ?? 0), 0);
    const inTransit = rows.filter((row) => ["packed", "shipped"].includes(String(row.status ?? ""))).length;
    const delivered = rows.filter((row) => String(row.status ?? "") === "delivered").length;
    const eWayPending = rows.filter((row) => {
      const dispatchId = String(row.id ?? "");
      return dispatchId.length > 0 && !eWayBills.some((bill) => String(bill.dispatch_id ?? "") === dispatchId);
    }).length;
    return { shipped, inTransit, delivered, eWayPending };
  }, [eWayBills, rows]);

  const salesOrderCandidates = useMemo(() => {
    const existing = new Set(rows.map((row) => String(row.sales_order_id ?? "")));
    return salesOrders.filter((row) => !existing.has(String(row.id ?? ""))).slice(0, 5);
  }, [rows, salesOrders]);

  const createFromSalesOrder = async (salesOrderId: string) => {
    setBusyOrderId(salesOrderId);
    try {
      const response = await fetch("/api/v1/delivery-dispatch/create-from-sales-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_order_id: salesOrderId })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Dispatch could not be created.");
      toast.success("Dispatch created from sales order.");
      await load();
      router.push(`/delivery-dispatch/${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispatch could not be created.");
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery / Dispatch" description="Track shipment release, carrier status, and proof-of-delivery progress for each dispatch." actionLabel="New dispatch" actionHref="/delivery-dispatch/new" />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Shipped value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.shipped)}</CardContent></Card>
        <Card><CardHeader><CardTitle>In transit</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.inTransit}</CardContent></Card>
        <Card><CardHeader><CardTitle>Delivered</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.delivered}</CardContent></Card>
        <Card><CardHeader><CardTitle>E-Way pending</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.eWayPending}</CardContent></Card>
      </div>
      {salesOrderCandidates.length ? (
        <Card>
          <CardHeader><CardTitle>Sales orders waiting for dispatch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {salesOrderCandidates.map((order) => (
              <div key={String(order.id)} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{String(order.sales_order_number ?? order.id)}</p>
                  <p className="text-sm text-muted-foreground">Order value {formatMoney(Number(order.total ?? 0))}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => createFromSalesOrder(String(order.id))} disabled={busyOrderId === String(order.id)}>
                    {busyOrderId === String(order.id) ? "Creating..." : "Create dispatch"}
                  </Button>
                  <Button asChild><Link href={`/sales-orders/${String(order.id)}`}>Open sales order</Link></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading dispatches...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Delivery / Dispatch" getRowHref={(row) => `/delivery-dispatch/${row.id}`} /> : <EmptyState title="No dispatches yet" description="Create the next dispatch to track fulfillment, shipping, and delivery proof." actionLabel="New dispatch" actionHref="/delivery-dispatch/new" />}
    </div>
  );
}
