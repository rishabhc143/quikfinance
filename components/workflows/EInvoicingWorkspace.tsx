"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/e-invoicing", { signal: controller.signal, cache: "no-store" });
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
    const queued = rows.filter((row) => ["queued", "submitted"].includes(String(row.status ?? ""))).length;
    const generated = rows.filter((row) => String(row.status ?? "") === "generated").length;
    const failed = rows.filter((row) => String(row.status ?? "") === "failed").length;
    return { queued, generated, failed };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="E-Invoicing" description="Manage IRN submission batches, generated acknowledgements, and failure queues." actionLabel="New submission" actionHref="/e-invoicing/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Queued / submitted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.queued}</CardContent></Card>
        <Card><CardHeader><CardTitle>Generated</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.generated}</CardContent></Card>
        <Card><CardHeader><CardTitle>Failed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.failed}</CardContent></Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading e-invoice submissions...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="E-Invoicing" getRowHref={(row) => `/e-invoicing/${row.id}`} /> : <EmptyState title="No e-invoice submissions yet" description="Create a submission record for the next eligible invoice IRN flow." actionLabel="New submission" actionHref="/e-invoicing/new" />}
    </div>
  );
}
