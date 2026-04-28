"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type EWayBillRecord = {
  id: string;
  dispatch_id?: string | null;
  invoice_id?: string | null;
  document_number: string;
  generated_on: string;
  transport_mode: string;
  transporter_name?: string | null;
  vehicle_number?: string | null;
  tracking_number?: string | null;
  distance_km: number;
  taxable_value: number;
  total_tax: number;
  valid_until?: string | null;
  status: string;
  notes?: string | null;
};

export function EWayBillDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<EWayBillRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/e-way-bills/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "E-Way Bill could not be loaded.");
        setRecord(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "E-Way Bill could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading E-Way Bill...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{record.document_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{record.transport_mode} transport</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/e-way-bill/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Generated on</span><span>{record.generated_on}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{record.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Transporter</span><span>{record.transporter_name || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span>{record.vehicle_number || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tracking</span><span>{record.tracking_number || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span>{record.distance_km} km</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Taxable value</span><span>{formatMoney(record.taxable_value)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total tax</span><span>{formatMoney(record.total_tax)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Valid until</span><span>{record.valid_until || '-'}</span></div>
          {record.dispatch_id ? <div className="flex justify-between"><span className="text-muted-foreground">Dispatch</span><Link href={`/delivery-dispatch/${record.dispatch_id}`} className="text-primary underline underline-offset-2">Open</Link></div> : null}
          {record.invoice_id ? <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><Link href={`/invoices/${record.invoice_id}`} className="text-primary underline underline-offset-2">Open</Link></div> : null}
          {record.notes ? <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><p className="mt-1">{record.notes}</p></div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
