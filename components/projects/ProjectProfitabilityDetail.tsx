"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { formatMoney } from "@/lib/utils/currency";
import type { TableRow } from "@/lib/modules";

const timeColumns = [
  { key: "work_date", label: "Date", kind: "date" as const },
  { key: "description", label: "Description" },
  { key: "hours", label: "Hours", align: "right" as const },
  { key: "entry_value", label: "Value", kind: "money" as const, align: "right" as const },
  { key: "is_billed", label: "Billed", kind: "boolean" as const, align: "center" as const }
];

const expenseColumns = [
  { key: "expense_date", label: "Date", kind: "date" as const },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", kind: "money" as const, align: "right" as const },
  { key: "tax_amount", label: "Tax", kind: "money" as const, align: "right" as const },
  { key: "status", label: "Status", kind: "status" as const }
];

type ProjectRecord = { id: string; name: string; budget_amount?: number; status?: string; billing_method?: string; customer_id?: string | null };
type AuditRow = { id: string; action?: string; entity_type?: string; entity_id?: string | null; created_at?: string; new_values?: Record<string, unknown> | null };

export function ProjectProfitabilityDetail({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [timeEntries, setTimeEntries] = useState<TableRow[]>([]);
  const [expenses, setExpenses] = useState<TableRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [projectRes, timeRes, expenseRes, auditRes] = await Promise.all([
          fetch(`/api/v1/projects/${id}`, { signal: controller.signal, cache: "no-store" }),
          fetch("/api/v1/time-entries", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/v1/expenses", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/audit-logs", { signal: controller.signal, cache: "no-store" })
        ]);
        const [projectJson, timeJson, expenseJson, auditJson] = await Promise.all([
          projectRes.json().catch(() => ({})),
          timeRes.json().catch(() => ({ data: [] })),
          expenseRes.json().catch(() => ({ data: [] })),
          auditRes.json().catch(() => ({ data: [] }))
        ]);
        setProject(projectJson.data ?? null);
        const filteredTime = (Array.isArray(timeJson.data) ? timeJson.data : []).filter((row: Record<string, unknown>) => String(row.project_id ?? "") === id).map((row: Record<string, unknown>) => ({ ...row, entry_value: Number(row.hours ?? 0) * Number(row.rate ?? 0) }));
        const filteredExpenses = (Array.isArray(expenseJson.data) ? expenseJson.data : []).filter((row: Record<string, unknown>) => String(row.project_id ?? "") === id);
        const filteredAudit = (Array.isArray(auditJson.data) ? auditJson.data : []).filter((row: Record<string, unknown>) => {
          const payload = typeof row.new_values === "object" && row.new_values !== null ? row.new_values as Record<string, unknown> : null;
          return String(payload?.project_id ?? "") === id && String(row.entity_type ?? "") === "invoice";
        });
        setTimeEntries(filteredTime);
        setExpenses(filteredExpenses);
        setAuditRows(filteredAudit as AuditRow[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  const metrics = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, row) => sum + Number(row.hours ?? 0), 0);
    const billedValue = timeEntries.filter((row) => Boolean(row.is_billed)).reduce((sum, row) => sum + Number(row.entry_value ?? 0), 0);
    const unbilledValue = timeEntries.filter((row) => Boolean(row.is_billable) && !Boolean(row.is_billed)).reduce((sum, row) => sum + Number(row.entry_value ?? 0), 0);
    const expenseValue = expenses.reduce((sum, row) => sum + Number(row.amount ?? 0) + Number(row.tax_amount ?? 0), 0);
    const profit = billedValue - expenseValue;
    return { totalHours, billedValue, unbilledValue, expenseValue, profit };
  }, [expenses, timeEntries]);

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading project profitability...</div>;
  }

  if (!project) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{project.billing_method || "billing method not set"} · {project.status || "status not set"}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/new?edit=${id}`} className="rounded-md border px-3 py-2 text-sm">Edit</Link>
            <Link href="/time-tracking/new" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Log time</Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Budget</p><p className="mt-2 text-2xl font-bold">{formatMoney(Number(project.budget_amount ?? 0))}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Total hours</p><p className="mt-2 text-2xl font-bold">{metrics.totalHours.toFixed(2)}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Billed value</p><p className="mt-2 text-2xl font-bold">{formatMoney(metrics.billedValue)}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Unbilled value</p><p className="mt-2 text-2xl font-bold">{formatMoney(metrics.unbilledValue)}</p></div>
          <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Profit after expenses</p><p className="mt-2 text-2xl font-bold">{formatMoney(metrics.profit)}</p></div>
        </CardContent>
      </Card>

      <DataTable columns={timeColumns} rows={timeEntries} title="Project Time Entries" getRowHref={(row) => `/time-tracking/${row.id}`} />
      <DataTable columns={expenseColumns} rows={expenses} title="Project Expenses" getRowHref={(row) => `/expenses/${row.id}`} />

      <Card>
        <CardHeader><CardTitle>Invoice allocation history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {auditRows.length ? auditRows.map((row) => {
            const payload = (row.new_values ?? {}) as Record<string, unknown>;
            const invoiceId = String(row.entity_id ?? "");
            const count = Array.isArray(payload.entry_ids) ? payload.entry_ids.length : 0;
            return (
              <div key={row.id} className="flex flex-col gap-2 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Invoice draft created from time entries</p>
                  <p className="text-sm text-muted-foreground">{count} entries · {row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                </div>
                {invoiceId ? <Link href={`/invoices/${invoiceId}`} className="text-sm text-primary underline underline-offset-2">Open invoice</Link> : null}
              </div>
            );
          }) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No invoice allocations recorded for this project yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

