"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type EInvoiceRecord = {
  id: string;
  invoice_id?: string | null;
  invoice_number: string;
  submission_number: string;
  submission_date: string;
  taxable_value: number;
  total_tax: number;
  status: string;
  irn?: string | null;
  ack_number?: string | null;
  ack_date?: string | null;
  error_message?: string | null;
};

export function EInvoicingDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<EInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/e-invoicing/${id}`, { signal });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "E-invoice submission could not be loaded.");
      setRecord(json.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-invoice submission could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading e-invoice submission...</div>;
  }

  const updateStatus = async (status: string) => {
    setWorking(status);
    try {
      const payload: Record<string, unknown> = { status };
      if (status === "generated") {
        payload.irn = record.irn || `IRN-${Date.now().toString().slice(-8)}`;
        payload.ack_number = record.ack_number || `ACK-${Date.now().toString().slice(-6)}`;
        payload.ack_date = record.ack_date || new Date().toISOString().slice(0, 10);
        payload.error_message = null;
      }
      if (status === "failed") {
        payload.error_message = record.error_message || "Provider validation failed during submission.";
      }
      const response = await fetch(`/api/v1/e-invoicing/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Status could not be updated.");
      toast.success(`Submission marked ${status}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status could not be updated.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{record.submission_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{record.invoice_number}</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/e-invoicing/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Submission date</span><span>{record.submission_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{record.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Taxable value</span><span>{formatMoney(record.taxable_value)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total tax</span><span>{formatMoney(record.total_tax)}</span></div>
          {record.irn ? <div className="flex justify-between"><span className="text-muted-foreground">IRN</span><span>{record.irn}</span></div> : null}
          {record.ack_number ? <div className="flex justify-between"><span className="text-muted-foreground">Ack number</span><span>{record.ack_number}</span></div> : null}
          {record.ack_date ? <div className="flex justify-between"><span className="text-muted-foreground">Ack date</span><span>{record.ack_date}</span></div> : null}
          {record.invoice_id ? <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><Link href={`/invoices/${record.invoice_id}`} className="text-primary underline underline-offset-2">{record.invoice_number}</Link></div> : null}
          {record.error_message ? <div className="md:col-span-2"><span className="text-muted-foreground">Error</span><p className="mt-1">{record.error_message}</p></div> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Compliance actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => updateStatus("submitted")} disabled={working !== null || record.status === "submitted"}>{working === "submitted" ? "Updating..." : "Mark submitted"}</Button>
          <Button onClick={() => updateStatus("generated")} disabled={working !== null || record.status === "generated"}>{working === "generated" ? "Updating..." : "Mark generated"}</Button>
          <Button variant="destructive" onClick={() => updateStatus("failed")} disabled={working !== null || record.status === "failed"}>{working === "failed" ? "Updating..." : "Mark failed"}</Button>
          <Button variant="secondary" onClick={() => updateStatus("cancelled")} disabled={working !== null || record.status === "cancelled"}>{working === "cancelled" ? "Updating..." : "Mark cancelled"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
