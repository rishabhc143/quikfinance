"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "section_code", label: "Section" },
  { key: "tax_kind", label: "Kind" },
  { key: "transaction_type", label: "Transaction" },
  { key: "party_name", label: "Party" },
  { key: "assessment_date", label: "Assessment", kind: "date" as const },
  { key: "tax_amount", label: "Tax amount", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

export function TdsTcsWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [recordsRes, customersRes, vendorsRes] = await Promise.all([
          fetch("/api/v1/tds-tcs", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/v1/customers", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/v1/vendors", { signal: controller.signal, cache: "no-store" })
        ]);
        const [recordsJson, customersJson, vendorsJson] = await Promise.all([
          recordsRes.json().catch(() => ({ data: [] })),
          customersRes.json().catch(() => ({ data: [] })),
          vendorsRes.json().catch(() => ({ data: [] }))
        ]);
        const partyMap = new Map<string, string>();
        for (const row of Array.isArray(customersJson.data) ? customersJson.data : []) {
          partyMap.set(String(row.id), String(row.display_name ?? "Customer"));
        }
        for (const row of Array.isArray(vendorsJson.data) ? vendorsJson.data : []) {
          partyMap.set(String(row.id), String(row.display_name ?? "Vendor"));
        }
        const mapped = Array.isArray(recordsJson.data)
          ? recordsJson.data.map((row: Record<string, unknown>) => ({
              ...row,
              party_name: partyMap.get(String(row.party_id ?? "")) ?? String(row.party_type ?? "party")
            }))
          : [];
        setRows(mapped);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const tax = rows.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
    const review = rows.filter((row) => String(row.status ?? "") === "review").length;
    const filed = rows.filter((row) => String(row.status ?? "") === "filed").length;
    return { tax, review, filed };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="TDS / TCS" description="Review withholding and collection tax records across bills, invoices, payments, and filing cycles." actionLabel="New tax record" actionHref="/tds-tcs/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Tracked tax</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.tax)}</CardContent></Card>
        <Card><CardHeader><CardTitle>In review</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.review}</CardContent></Card>
        <Card><CardHeader><CardTitle>Filed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.filed}</CardContent></Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading tax records...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="TDS/TCS" getRowHref={(row) => `/tds-tcs/${row.id}`} /> : <EmptyState title="No tax records yet" description="Create the first TDS or TCS assessment record to start the withholding workflow." actionLabel="New tax record" actionHref="/tds-tcs/new" />}
    </div>
  );
}
