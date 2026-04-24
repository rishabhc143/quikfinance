"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  created_at: string;
};

type WorkflowResponse = {
  records: ExceptionRecord[];
  total: number;
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

export function ExceptionsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("operations");
  const [severity, setSeverity] = useState("medium");

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

  const createException = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/exception-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, severity, status: "open" })
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
      await queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Exception could not be created.");
    }
  });

  const updateException = useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: ExceptionRecord["status"]; resolution?: string }) => {
      const response = await fetch(`/api/v1/workflows/exception-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution })
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

  const records = useMemo(() => exceptions.data?.records ?? [], [exceptions.data?.records]);
  const openCount = useMemo(() => records.filter((record) => record.status === "open").length, [records]);
  const criticalCount = useMemo(() => records.filter((record) => record.severity === "critical").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Open exceptions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{openCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Critical issues</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{criticalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total exceptions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{exceptions.data?.total ?? 0}</CardContent>
        </Card>
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
                <option value="banking">Banking</option>
                <option value="documents">Documents</option>
                <option value="imports">Imports</option>
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
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Exception queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exceptions" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {exceptions.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading exceptions...</div> : null}
          {exceptions.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(exceptions.error as Error).message}</div> : null}
          {!exceptions.isLoading && !exceptions.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No exceptions found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.title}</p>
                    <Badge tone={severityTone(record.severity)}>{record.severity}</Badge>
                    <Badge tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Badge>
                    <Badge tone="muted">{record.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{record.description || "-"}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                    {record.resolution ? <span>Resolution: {record.resolution}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status === "open" ? <Button variant="secondary" onClick={() => updateException.mutate({ id: record.id, status: "in_progress" })}>Start</Button> : null}
                  {record.status !== "resolved" ? <Button onClick={() => updateException.mutate({ id: record.id, status: "resolved", resolution: "Resolved from exception queue" })}>Resolve</Button> : null}
                  {record.status !== "ignored" ? <Button variant="ghost" onClick={() => updateException.mutate({ id: record.id, status: "ignored", resolution: "Ignored from exception queue" })}>Ignore</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
