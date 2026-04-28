"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatMoney } from "@/lib/utils/currency";
import type { TableRow } from "@/lib/modules";

const columns = [
  { key: "document_number", label: "Document" },
  { key: "dispatch_number", label: "Dispatch" },
  { key: "invoice_number", label: "Invoice" },
  { key: "generated_on", label: "Generated", kind: "date" as const },
  { key: "taxable_value", label: "Taxable", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

type DispatchCandidate = {
  id: string;
  dispatch_number?: string | null;
  dispatch_date?: string | null;
  carrier_name?: string | null;
  shipped_value?: number | null;
  status?: string | null;
};

export function EWayBillWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [dispatches, setDispatches] = useState<DispatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [recordRes, dispatchRes] = await Promise.all([
        fetch("/api/v1/e-way-bills", { signal, cache: "no-store" }),
        fetch("/api/v1/delivery-dispatch", { signal, cache: "no-store" })
      ]);
      const recordJson = await recordRes.json().catch(() => ({ data: [] }));
      const dispatchJson = await dispatchRes.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(recordJson.data) ? recordJson.data : []);
      setDispatches(Array.isArray(dispatchJson.data) ? dispatchJson.data : []);
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
    const generated = rows.filter((row) => String(row.status ?? "") === "generated").length;
    const ready = rows.filter((row) => String(row.status ?? "") === "ready").length;
    const expiring = rows.filter((row) => String(row.status ?? "") === "ready" || String(row.status ?? "") === "draft").length;
    const taxable = rows.reduce((sum, row) => sum + Number(row.taxable_value ?? 0), 0);
    return { generated, ready, expiring, taxable };
  }, [rows]);

  const candidates = useMemo(() => {
    const used = new Set(rows.map((row) => String(row.dispatch_id ?? "")));
    return dispatches.filter((dispatch) => !used.has(String(dispatch.id)));
  }, [dispatches, rows]);

  const generate = async (dispatchId: string) => {
    setBusyId(dispatchId);
    try {
      const response = await fetch("/api/v1/e-way-bills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch_id: dispatchId })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "E-Way Bill could not be generated.");
      toast.success("E-Way Bill generated.");
      await load();
      router.push(`/e-way-bill/${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-Way Bill could not be generated.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Generated</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.generated}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Ready to file</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.ready}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open readiness</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.expiring}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Movement taxable value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(metrics.taxable)}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading E-Way Bills...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="E-Way Bills" getRowHref={(row) => `/e-way-bill/${row.id}`} /> : <EmptyState title="No E-Way Bills yet" description="Generate the first document from a delivery dispatch or create a manual record." actionLabel="New E-Way Bill" actionHref="/e-way-bill/new" />}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dispatch candidates</CardTitle>
              <Button asChild variant="secondary"><Link href="/e-way-bill/new">Manual entry</Link></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Every current dispatch already has an E-Way Bill record or no dispatches exist yet.</div>
              ) : (
                candidates.slice(0, 6).map((dispatch) => (
                  <div key={dispatch.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{dispatch.dispatch_number || dispatch.id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{dispatch.carrier_name || "Carrier missing"} · {dispatch.dispatch_date || "No date"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Shipped value {formatMoney(Number(dispatch.shipped_value ?? 0))}</p>
                      </div>
                      <Button onClick={() => generate(dispatch.id)} disabled={busyId === dispatch.id}>{busyId === dispatch.id ? "Generating..." : "Generate"}</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Related controls</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/delivery-dispatch">Delivery / Dispatch</Link></Button>
              <Button asChild variant="secondary"><Link href="/e-invoicing">E-Invoicing</Link></Button>
              <Button asChild variant="secondary"><Link href="/gst-command-center">GST command center</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

