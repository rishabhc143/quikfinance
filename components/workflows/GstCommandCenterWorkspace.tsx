"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GstExceptionRecord = {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "ignored";
  created_at: string;
};

type WorkflowResponse = {
  records: GstExceptionRecord[];
  total: number;
};

function severityTone(severity: GstExceptionRecord["severity"]) {
  if (severity === "critical") return "danger" as const;
  if (severity === "high") return "warning" as const;
  if (severity === "medium") return "info" as const;
  return "muted" as const;
}

function statusTone(status: GstExceptionRecord["status"]) {
  if (status === "resolved") return "success" as const;
  if (status === "ignored") return "muted" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

export function GstCommandCenterWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<GstExceptionRecord["severity"]>("high");

  const gstQueue = useQuery({
    queryKey: ["gst-command-center", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/gst-command-center${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "GST issues could not be loaded.");
      return payload.data;
    }
  });

  const createIssue = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/gst-command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category: "gst", severity, status: "open" })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "GST issue could not be created.");
    },
    onSuccess: async () => {
      toast.success("GST issue logged.");
      setTitle("");
      setDescription("");
      setSeverity("high");
      await queryClient.invalidateQueries({ queryKey: ["gst-command-center"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "GST issue could not be created.")
  });

  const updateIssue = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GstExceptionRecord["status"] }) => {
      const response = await fetch(`/api/v1/workflows/gst-command-center/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "GST issue update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gst-command-center"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "GST issue update failed.")
  });

  const records = useMemo(() => (gstQueue.data?.records ?? []).filter((record) => record.category === "gst"), [gstQueue.data?.records]);
  const openCount = useMemo(() => records.filter((record) => record.status === "open").length, [records]);
  const criticalCount = useMemo(() => records.filter((record) => record.severity === "critical").length, [records]);
  const inProgressCount = useMemo(() => records.filter((record) => record.status === "in_progress").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open blockers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{openCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Critical</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{criticalCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">In progress</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{inProgressCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total GST issues</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{records.length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Log GST issue</CardTitle>
          <div className="flex gap-2">
            <Button asChild variant="secondary"><Link href="/reports/gstr-1">GSTR-1</Link></Button>
            <Button asChild variant="secondary"><Link href="/reports/gstr-3b">GSTR-3B</Link></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="gst-title">Title</Label>
              <Input id="gst-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="gst-severity">Severity</Label>
              <select id="gst-severity" value={severity} onChange={(event) => setSeverity(event.target.value as GstExceptionRecord["severity"])} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="gst-description">Description</Label>
              <Input id="gst-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Missing GSTIN, place of supply mismatch, filing blocker" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createIssue.mutate()} disabled={createIssue.isPending || !title.trim()}>
                {createIssue.isPending ? "Logging..." : "Log GST issue"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>GST queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search GST issues" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {gstQueue.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading GST issues...</div> : null}
          {gstQueue.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(gstQueue.error as Error).message}</div> : null}
          {!gstQueue.isLoading && !gstQueue.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No GST issues found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.title}</p>
                    <Badge tone={severityTone(record.severity)}>{record.severity}</Badge>
                    <Badge tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{record.description || "-"}</p>
                  <div className="text-sm text-muted-foreground">{new Date(record.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status === "open" ? <Button variant="secondary" onClick={() => updateIssue.mutate({ id: record.id, status: "in_progress" })}>Start</Button> : null}
                  {record.status !== "resolved" ? <Button onClick={() => updateIssue.mutate({ id: record.id, status: "resolved" })}>Resolve</Button> : null}
                  {record.status !== "ignored" ? <Button variant="ghost" onClick={() => updateIssue.mutate({ id: record.id, status: "ignored" })}>Ignore</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
