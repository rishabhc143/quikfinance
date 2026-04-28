"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ComplianceExceptionsPanel } from "@/components/compliance/ComplianceExceptionsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "submission_number", label: "Submission" },
  { key: "invoice_number", label: "Invoice" },
  { key: "submission_date", label: "Submitted", kind: "date" as const },
  { key: "taxable_value", label: "Taxable value", kind: "money" as const, align: "right" as const },
  { key: "irn", label: "IRN" },
  { key: "status", label: "Status", kind: "status" as const }
];

export function EInvoicingWorkspace() {
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [invoices, setInvoices] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyInvoice, setBusyInvoice] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [submissionRes, invoiceRes] = await Promise.all([
        fetch("/api/v1/e-invoicing", { signal, cache: "no-store" }),
        fetch("/api/v1/invoices", { signal, cache: "no-store" })
      ]);
      const submissionJson = await submissionRes.json().catch(() => ({ data: [] }));
      const invoiceJson = await invoiceRes.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(submissionJson.data) ? submissionJson.data : []);
      setInvoices(Array.isArray(invoiceJson.data) ? invoiceJson.data : []);
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
    const queued = rows.filter((row) => ["queued", "submitted"].includes(String(row.status ?? ""))).length;
    const generated = rows.filter((row) => String(row.status ?? "") === "generated").length;
    const failed = rows.filter((row) => String(row.status ?? "") === "failed").length;
    return { queued, generated, failed };
  }, [rows]);

  const eligibleInvoices = useMemo(() => {
    const existing = new Set(rows.map((row) => String(row.invoice_id ?? "")));
    return invoices.filter((row) => {
      const status = String(row.status ?? "");
      return !existing.has(String(row.id)) && ["sent", "viewed", "partial", "paid", "overdue"].includes(status);
    }).slice(0, 6);
  }, [invoices, rows]);

  const queueInvoice = async (invoiceId: string) => {
    setBusyInvoice(invoiceId);
    try {
      const response = await fetch("/api/v1/e-invoicing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Submission could not be queued.");
      toast.success("E-invoice submission queued.");
      await load();
      router.push(`/e-invoicing/${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission could not be queued.");
    } finally {
      setBusyInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="E-Invoicing" description="Manage IRN submission batches, generated acknowledgements, and failure queues." actionLabel="New submission" actionHref="/e-invoicing/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Queued / submitted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.queued}</CardContent></Card>
        <Card><CardHeader><CardTitle>Generated</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.generated}</CardContent></Card>
        <Card><CardHeader><CardTitle>Failed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.failed}</CardContent></Card>
      </div>
      <ComplianceExceptionsPanel title="Submission blockers" entityType="e_invoice_submission" detailBasePath="/e-invoicing" />
      {eligibleInvoices.length ? (
        <Card>
          <CardHeader><CardTitle>Eligible invoices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {eligibleInvoices.map((invoice) => (
              <div key={String(invoice.id)} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{String(invoice.invoice_number ?? invoice.id)}</p>
                  <p className="text-sm text-muted-foreground">Taxable value {formatMoney(Number(invoice.total ?? 0) - Number(invoice.tax_total ?? 0))}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => queueInvoice(String(invoice.id))} disabled={busyInvoice === String(invoice.id)}>
                    {busyInvoice === String(invoice.id) ? "Queueing..." : "Queue submission"}
                  </Button>
                  <Button asChild>
                    <Link href={`/invoices/${String(invoice.id)}`}>Open invoice</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading e-invoice submissions...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="E-Invoicing" getRowHref={(row) => `/e-invoicing/${row.id}`} /> : <EmptyState title="No e-invoice submissions yet" description="Create a submission record for the next eligible invoice IRN flow." actionLabel="New submission" actionHref="/e-invoicing/new" />}
    </div>
  );
}

