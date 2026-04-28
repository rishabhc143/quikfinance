"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { DataColumn, TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

type Variant = "credit-note" | "vendor-credit";

const columnsByVariant: Record<Variant, DataColumn[]> = {
  "credit-note": [
    { key: "credit_note_number", label: "Credit note" },
    { key: "customer", label: "Customer" },
    { key: "issue_date", label: "Date", kind: "date" },
    { key: "total", label: "Amount", kind: "money", align: "right" },
    { key: "status", label: "Status", kind: "status" }
  ],
  "vendor-credit": [
    { key: "vendor_credit_number", label: "Vendor credit" },
    { key: "vendor", label: "Vendor" },
    { key: "issue_date", label: "Date", kind: "date" },
    { key: "total", label: "Amount", kind: "money", align: "right" },
    { key: "status", label: "Status", kind: "status" }
  ]
};

export function AdjustmentsWorkspace({ variant }: { variant: Variant }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isCredit = variant === "credit-note";
  const title = isCredit ? "Credit Notes" : "Vendor Credits";
  const apiPath = isCredit ? "/api/v1/credit-notes" : "/api/v1/vendor-credits";
  const newPath = isCredit ? "/credit-notes/new" : "/vendor-credits/new";
  const listPath = isCredit ? "/credit-notes" : "/vendor-credits";

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiPath, { signal: controller.signal, cache: "no-store" });
        const json = await response.json().catch(() => ({ data: [] }));
        setRows(Array.isArray(json.data) ? json.data : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [apiPath]);

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const open = rows.filter((row) => String(row.status ?? "") !== "applied").length;
    const applied = rows.filter((row) => String(row.status ?? "") === "applied").length;
    return { total, open, applied };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={isCredit ? "Issue sales adjustments against original invoices and track unapplied customer credits." : "Capture supplier credits and monitor which returns or disputes are still waiting to be applied."}
        actionLabel={isCredit ? "New credit note" : "New vendor credit"}
        actionHref={newPath}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.total)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Open adjustments</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.open}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Applied</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{summary.applied}</div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href={isCredit ? "/collections" : "/payables"}>{isCredit ? "Collections" : "Payables"}</Link></Button>
              <Button asChild variant="secondary"><Link href={isCredit ? "/invoices" : "/bills"}>{isCredit ? "Invoices" : "Bills"}</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading {title.toLowerCase()}...</div> : rows.length ? <DataTable columns={columnsByVariant[variant]} rows={rows} title={title} getRowHref={(row) => `${listPath}/${row.id}`} /> : <EmptyState title={`No ${title.toLowerCase()} yet`} description={isCredit ? "Create a customer credit for a return, rate correction, or cancellation." : "Capture the next supplier return or dispute as a vendor credit."} actionLabel={isCredit ? "New credit note" : "New vendor credit"} actionHref={newPath} />}
    </div>
  );
}
