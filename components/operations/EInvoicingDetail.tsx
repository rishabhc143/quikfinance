"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/e-invoicing/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "E-invoice submission could not be loaded.");
        setRecord(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "E-invoice submission could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading e-invoice submission...</div>;
  }

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
    </div>
  );
}
