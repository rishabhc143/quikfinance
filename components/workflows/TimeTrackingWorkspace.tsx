"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProject, setBusyProject] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [entriesRes, projectsRes] = await Promise.all([
        fetch("/api/v1/time-entries", { signal, cache: "no-store" }),
        fetch("/api/v1/projects", { signal, cache: "no-store" })
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

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const hours = rows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0);
    const unbilled = rows.filter((row) => Boolean(row.is_billable) && !Boolean(row.is_billed)).reduce((sum, row) => sum + Number(row.entry_value ?? 0), 0);
    const billed = rows.filter((row) => Boolean(row.is_billed)).length;
    return { hours, unbilled, billed };
  }, [rows]);

  const projectBilling = useMemo(() => {
    const grouped = new Map<string, { project_id: string; project_name: string; entries: number; hours: number; value: number }>();
    for (const row of rows) {
      if (!Boolean(row.is_billable) || Boolean(row.is_billed)) continue;
      const key = String(row.project_id ?? "");
      if (!key) continue;
      const existing = grouped.get(key) ?? { project_id: key, project_name: String(row.project_name ?? "Project"), entries: 0, hours: 0, value: 0 };
      existing.entries += 1;
      existing.hours += Number(row.hours ?? 0);
      existing.value += Number(row.entry_value ?? 0);
      grouped.set(key, existing);
    }
    return [...grouped.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [rows]);

  const createInvoiceDraft = async (projectId: string) => {
    setBusyProject(projectId);
    try {
      const response = await fetch("/api/v1/time-entries/invoice-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Invoice draft could not be created.");
      toast.success("Invoice draft created from time entries.");
      await load();
      router.push(`/invoices/${json.data.invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice draft could not be created.");
    } finally {
      setBusyProject(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Time Tracking" description="Log project hours, keep billable work visible, and monitor what is still waiting to be invoiced." actionLabel="Log time" actionHref="/time-tracking/new" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total hours</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.hours.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Unbilled value</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(summary.unbilled)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Billed entries</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.billed}</CardContent></Card>
      </div>
      {projectBilling.length ? (
        <Card>
          <CardHeader><CardTitle>Invoice-ready project time</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {projectBilling.map((project) => (
              <div key={project.project_id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{project.project_name}</p>
                  <p className="text-sm text-muted-foreground">{project.entries} entries Â· {project.hours.toFixed(2)} hours</p>
                  <p className="mt-1 text-sm text-muted-foreground">Unbilled value {formatMoney(project.value)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => createInvoiceDraft(project.project_id)} disabled={busyProject === project.project_id}>
                    {busyProject === project.project_id ? "Creating..." : "Create invoice draft"}
                  </Button>
                  <Button asChild>
                    <a href={`/projects/${project.project_id}`}>Open project</a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading time entries...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Time Tracking" getRowHref={(row) => `/time-tracking/${row.id}`} /> : <EmptyState title="No time entries yet" description="Log project time to build up timesheet billing and profitability history." actionLabel="Log time" actionHref="/time-tracking/new" />}
    </div>
  );
}

