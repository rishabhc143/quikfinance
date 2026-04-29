"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getEntityHref, getEntityLabel } from "@/lib/workspace-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExceptionRecord = {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "ignored";
  resolution: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  assigned_to?: string | null;
  created_at: string;
};

type WorkflowResponse = {
  records: ExceptionRecord[];
  total: number;
};

type AssignableUser = {
  id: string;
  full_name: string;
  role: string;
};

function severityTone(severity: string) {
  if (severity === "critical") return "danger" as const;
  if (severity === "high") return "warning" as const;
  if (severity === "medium") return "info" as const;
  return "muted" as const;
}

function statusTone(status: string) {
  if (status === "resolved") return "success" as const;
  if (status === "ignored") return "muted" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

function ageLabel(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

export function ExceptionsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("operations");
  const [severity, setSeverity] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  const exceptions = useQuery({
    queryKey: ["exceptions", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/exception-queue${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Exceptions could not be loaded.");
      }
      return payload.data;
    }
  });

  const assignableUsers = useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => {
      const response = await fetch("/api/v1/users/assignable", { cache: "no-store" });
      if (response.status === 403) {
        return [] as AssignableUser[];
      }
      const payload = (await response.json()) as { data?: AssignableUser[]; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Assignable users could not be loaded.");
      }
      return payload.data;
    }
  });

  const createException = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/exception-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, severity, status: "open", assigned_to: assignedTo || null })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Exception could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success("Exception created.");
      setTitle("");
      setDescription("");
      setCategory("operations");
      setSeverity("medium");
      setAssignedTo("");
      await queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Exception could not be created.");
    }
  });

  const updateException = useMutation({
    mutationFn: async ({ id, status, resolution, assigned_to }: { id: string; status?: ExceptionRecord["status"]; resolution?: string; assigned_to?: string | null }) => {
      const response = await fetch(`/api/v1/workflows/exception-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution, assigned_to })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Exception update failed.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Exception update failed.");
    }
  });

  const records = useMemo(() => {
    const rows = exceptions.data?.records ?? [];
    return rows.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (severityFilter !== "all" && record.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && record.category !== categoryFilter) return false;
      if (assigneeFilter === "unassigned" && record.assigned_to) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && record.assigned_to !== assigneeFilter) return false;
      return true;
    });
  }, [assigneeFilter, categoryFilter, exceptions.data?.records, severityFilter, statusFilter]);

  const userMap = useMemo(() => new Map((assignableUsers.data ?? []).map((user) => [user.id, user])), [assignableUsers.data]);
  const categories = useMemo(() => ["all", ...Array.from(new Set((exceptions.data?.records ?? []).map((record) => record.category))).sort()], [exceptions.data?.records]);
  const openCount = useMemo(() => records.filter((record) => record.status === "open").length, [records]);
  const inProgressCount = useMemo(() => records.filter((record) => record.status === "in_progress").length, [records]);
  const highPriorityCount = useMemo(() => records.filter((record) => ["high", "critical"].includes(record.severity)).length, [records]);
  const unassignedCount = useMemo(() => records.filter((record) => !record.assigned_to).length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open exceptions</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{openCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">In progress</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{inProgressCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">High priority</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{highPriorityCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Unassigned</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{unassignedCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log exception</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="exception-title">Title</Label>
              <Input id="exception-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="exception-category">Category</Label>
              <select id="exception-category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="operations">Operations</option>
                <option value="gst">GST</option>
                <option value="bank">Banking</option>
                <option value="documents">Documents</option>
                <option value="imports">Imports</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            <div>
              <Label htmlFor="exception-severity">Severity</Label>
              <select id="exception-severity" value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <Label htmlFor="exception-assignee">Assign to</Label>
              <select id="exception-assignee" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Unassigned</option>
                {(assignableUsers.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name} · {user.role}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="exception-description">Description</Label>
              <Textarea id="exception-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createException.mutate()} disabled={!title.trim() || createException.isPending}>
                {createException.isPending ? "Logging..." : "Log exception"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Exception controls</CardTitle>
            <p className="text-sm text-muted-foreground">Filter by status, severity, category, and owner before working the queue.</p>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exceptions" className="lg:max-w-xs" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            {categories.map((value) => <option key={value} value={value}>{value === "all" ? "All categories" : value}</option>)}
          </select>
          <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All owners</option>
            <option value="unassigned">Unassigned</option>
            {(assignableUsers.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exception queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exceptions.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading exceptions...</div> : null}
          {exceptions.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(exceptions.error as Error).message}</div> : null}
          {!exceptions.isLoading && !exceptions.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No exceptions found.</div> : null}
          {records.map((record) => {
            const entityHref = getEntityHref(record.entity_type, record.entity_id);
            const assignee = record.assigned_to ? userMap.get(record.assigned_to) : null;
            const resolutionDraft = resolutionDrafts[record.id] ?? "";

            return (
              <div key={record.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.title}</p>
                      <Badge tone={severityTone(record.severity)}>{record.severity}</Badge>
                      <Badge tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Badge>
                      <Badge tone="muted">{record.category}</Badge>
                      {entityHref ? <Link href={entityHref} className="text-xs text-primary underline underline-offset-2">Open {getEntityLabel(record.entity_type)}</Link> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{record.description || "-"}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                      <span>{ageLabel(record.created_at)}</span>
                      <span>Owner: {assignee ? `${assignee.full_name} (${assignee.role})` : "Unassigned"}</span>
                      {record.entity_type ? <span>Source: {getEntityLabel(record.entity_type)}</span> : null}
                    </div>
                    {record.resolution ? <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Resolution: {record.resolution}</div> : null}
                  </div>
                  <div className="w-full max-w-md space-y-3">
                    <div>
                      <Label htmlFor={`assignee-${record.id}`}>Assign owner</Label>
                      <select
                        id={`assignee-${record.id}`}
                        value={record.assigned_to ?? ""}
                        onChange={(event) => updateException.mutate({ id: record.id, assigned_to: event.target.value || null })}
                        className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {(assignableUsers.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.full_name} · {user.role}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor={`resolution-${record.id}`}>Resolution notes</Label>
                      <Textarea
                        id={`resolution-${record.id}`}
                        rows={3}
                        value={resolutionDraft}
                        onChange={(event) => setResolutionDrafts((current) => ({ ...current, [record.id]: event.target.value }))}
                        placeholder="Why this was resolved or ignored"
                        className="mt-2"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {record.status === "open" ? <Button variant="secondary" onClick={() => updateException.mutate({ id: record.id, status: "in_progress", resolution: resolutionDraft || undefined })}>Start</Button> : null}
                      {record.status !== "resolved" ? <Button onClick={() => updateException.mutate({ id: record.id, status: "resolved", resolution: resolutionDraft || "Resolved from exception queue" })}>Resolve</Button> : null}
                      {record.status !== "ignored" ? <Button variant="ghost" onClick={() => updateException.mutate({ id: record.id, status: "ignored", resolution: resolutionDraft || "Ignored from exception queue" })}>Ignore</Button> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

