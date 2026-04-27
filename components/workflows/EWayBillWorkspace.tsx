"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DispatchRow = {
  id: string;
  status?: string;
  invoice_number?: string | null;
  vehicle_number?: string | null;
  transporter_name?: string | null;
};

type InvoiceRow = {
  id: string;
  status?: string;
  total?: number;
};

export function EWayBillWorkspace() {
  const dispatches = useQuery({
    queryKey: ["eway-dispatches"],
    queryFn: async () => {
      const response = await fetch("/api/v1/delivery-dispatch");
      const payload = (await response.json()) as { data?: DispatchRow[] };
      if (!response.ok) {
        return [];
      }
      return payload.data ?? [];
    }
  });

  const invoices = useQuery({
    queryKey: ["eway-invoices"],
    queryFn: async () => {
      const response = await fetch("/api/v1/invoices");
      const payload = (await response.json()) as { data?: InvoiceRow[] };
      if (!response.ok) {
        return [];
      }
      return payload.data ?? [];
    }
  });

  const metrics = useMemo(() => {
    const dispatchRows = dispatches.data ?? [];
    const invoiceRows = invoices.data ?? [];
    return {
      dispatches: dispatchRows.length,
      invoiceCandidates: invoiceRows.filter((row) => row.status === "sent" || row.status === "paid" || row.status === "partial").length,
      missingTransport: dispatchRows.filter((row) => !row.vehicle_number && !row.transporter_name).length,
      gstReady: invoiceRows.filter((row) => Number(row.total ?? 0) > 0).length
    };
  }, [dispatches.data, invoices.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Dispatch records</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.dispatches}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Invoice candidates</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.invoiceCandidates}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Missing transport data</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.missingTransport}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">GST-ready docs</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.gstReady}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>E-Way Bill Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(dispatches.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No dispatch records yet. Create a delivery / dispatch record before handling e-way bill readiness.</div>
            ) : (
              (dispatches.data ?? []).slice(0, 8).map((dispatch) => (
                <div key={dispatch.id} className="rounded-2xl border p-4">
                  <p className="font-semibold">{dispatch.invoice_number || dispatch.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dispatch.vehicle_number ? `Vehicle ${dispatch.vehicle_number}` : "Vehicle missing"}
                    {dispatch.transporter_name ? ` · ${dispatch.transporter_name}` : " · Transporter missing"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Required Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/40 p-3">Dispatch record with quantity and shipment date</div>
              <div className="rounded-xl bg-muted/40 p-3">Invoice or movement document with GST-ready taxable values</div>
              <div className="rounded-xl bg-muted/40 p-3">Vehicle or transporter details for movement tracking</div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary"><Link href="/delivery-dispatch">Delivery / Dispatch</Link></Button>
                <Button asChild variant="secondary"><Link href="/invoices">Invoices</Link></Button>
                <Button asChild variant="secondary"><Link href="/gst-command-center">GST command center</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
