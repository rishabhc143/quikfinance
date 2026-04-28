"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

const columns = [
  { key: "work_date", label: "Date", kind: "date" as const },
  { key: "project_name", label: "Project" },
  { key: "description", label: "Description" },
  { key: "hours", label: "Hours", align: "right" as const },
  { key: "rate", label: "Rate", kind: "money" as const, align: "right" as const },
  { key: "entry_value", label: "Value", kind: "money" as const, align: "right" as const }
];

export function TimeTrackingWorkspace() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [entriesRes, projectsRes] = await Promise.all([
          fetch("/api/v1/time-entries", { signal: controller.signal, cache: "no-store" }),
          fetch("/api/v1/projects", { signal: controller.signal, cache: "no-store" })
        ]);
        const entriesJson = await entriesRes.json().catch(() => ({ data: [] }));
        const projectsJson = await projectsRes.json().catch(() => ({ data: [] }));
        const projectMap = new Map(
          (Array.isArray(projectsJson.data) ? projectsJson.data : []).map((project: Record<string, unknown>) => [String(project.id), String(project.name ?? "Project")])
        );
        const mapped = Array.isArray(entriesJson.data)
          ? entriesJson.data.map((entry: Record<string, unknown>) => ({
              ...entry,
              project_name: projectMap.get(String(entry.project_id ?? "")) ?? "Project",
              entry_value: Number(entry.hours ?? 0) * Number(entry.rate ?? 0)
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
    const hours = rows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0);
    const unbilled = rows.filter((row) => Boolean(row.is_billable) && !Boolean(row.is_billed)).reduce((sum, row) => sum + Number(row.entry_value ?? 0), 0);
    const billed = rows.filter((row) => Boolean(row.is_billed)).length;
    return { hours, unbilled, billed };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader title="Time Tracking" description="Log project hours, keep billable work visible, and monitor what is still waiting to be invoiced." actionLabel="Log time" actionHref="/time-tracking/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total hours</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.hours.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Unbilled value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.unbilled)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Billed entries</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.billed}</CardContent></Card>
      </div>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading time entries...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Time Tracking" getRowHref={(row) => `/time-tracking/${row.id}`} /> : <EmptyState title="No time entries yet" description="Log project time to build up timesheet billing and profitability history." actionLabel="Log time" actionHref="/time-tracking/new" />}
    </div>
  );
}
