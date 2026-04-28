"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TableRow } from "@/lib/modules";

const columns = [
  { key: "start_date", label: "Start", kind: "date" as const },
  { key: "end_date", label: "End", kind: "date" as const },
  { key: "lock_scope", label: "Scope" },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", kind: "status" as const }
];

export function PeriodLocksWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(initialComposerOpen);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    lock_scope: "all",
    reason: "",
    is_active: true
  });

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/period-locks", { signal, cache: "no-store" });
      const json = await response.json().catch(() => ({ data: [] }));
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const active = rows.filter((row) => String(row.status ?? "") === "active").length;
    const allScope = rows.filter((row) => String(row.lock_scope ?? "") === "all").length;
    const mostRecent = rows[0]?.end_date ? String(rows[0].end_date) : "-";
    return { active, allScope, mostRecent };
  }, [rows]);

  const createLock = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/v1/period-locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Period lock could not be created.");
      toast.success("Period lock created.");
      setForm({ start_date: "", end_date: "", lock_scope: "all", reason: "", is_active: true });
      setComposerOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Period lock could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Period Locks" description="Lock closed periods to block back-dated accounting changes across operational modules." actionLabel={composerOpen ? "Hide form" : "Lock period"} actionHref={composerOpen ? "/period-locks" : "/period-locks/new"} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Active locks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle>Global locks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.allScope}</CardContent></Card>
        <Card><CardHeader><CardTitle>Latest locked end</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.mostRecent}</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lock controls</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setComposerOpen((value) => !value)}>{composerOpen ? "Hide lock form" : "Add period lock"}</Button>
            <Button asChild variant="secondary"><Link href="/close-management">Open close dashboard</Link></Button>
          </div>
        </CardHeader>
        {composerOpen ? (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label htmlFor="lock-start">Start date</Label><Input id="lock-start" type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></div>
            <div><Label htmlFor="lock-end">End date</Label><Input id="lock-end" type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} /></div>
            <div>
              <Label htmlFor="lock-scope">Scope</Label>
              <select id="lock-scope" value={form.lock_scope} onChange={(event) => setForm((current) => ({ ...current, lock_scope: event.target.value }))} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="all">All</option>
                <option value="sales">Sales</option>
                <option value="purchases">Purchases</option>
                <option value="banking">Banking</option>
                <option value="journals">Journals</option>
              </select>
            </div>
            <div><Label htmlFor="lock-reason">Reason</Label><Input id="lock-reason" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /></div>
            <div className="flex items-center gap-2"><input id="lock-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><Label htmlFor="lock-active">Active</Label></div>
            <div className="md:col-span-2 flex justify-end"><Button onClick={createLock} disabled={creating || !form.start_date || !form.end_date}>{creating ? "Locking..." : "Create lock"}</Button></div>
          </CardContent>
        ) : null}
      </Card>
      {loading ? <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading period locks...</div> : rows.length ? <DataTable columns={columns} rows={rows} title="Period Locks" /> : <EmptyState title="No period locks yet" description="Create a lock after financial close to prevent back-dated changes." actionLabel="Lock period" actionHref="/period-locks/new" />}
    </div>
  );
}
