"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClosePayload = {
  metrics: { open_tasks: number; blocked_tasks: number; ready_to_lock: boolean; progress: number };
  tasks: Array<{ id: string; title: string; owner_role: string; status: string; due_date: string | null; period_start: string; period_end: string; created_at: string }>;
  period_locks: Array<{ id: string; start_date: string; end_date: string; lock_scope: string; is_active: boolean; created_at: string }>;
  dependencies: { open_exceptions: number; pending_approvals: number };
};

function tone(status: string) {
  if (status === "done") return "success" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

export function CloseManagementWorkspace() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [ownerRole, setOwnerRole] = useState("accountant");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const overview = useQuery({
    queryKey: ["close-management-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/close-management", { cache: "no-store" });
      const payload = (await response.json()) as { data?: ClosePayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Close management overview could not be loaded.");
      return payload.data;
    }
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const response = await fetch("/api/v1/workflows/close-management", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, owner_role: ownerRole, due_date: dueDate, period_start: today, period_end: today, status: "open" }) });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Close task could not be created.");
    },
    onSuccess: async () => {
      toast.success("Close task created.");
      setTitle("");
      await queryClient.invalidateQueries({ queryKey: ["close-management-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Close task could not be created.")
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/v1/workflows/close-management/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Close task update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["close-management-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Close task update failed.")
  });

  const tasks = useMemo(() => overview.data?.tasks ?? [], [overview.data?.tasks]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open tasks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.open_tasks ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Blocked tasks</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.blocked_tasks ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Ready to lock</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.ready_to_lock ? "Yes" : "No"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Progress</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.progress ?? 0}%</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Create close task</CardTitle></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-4"><div><Label htmlFor="close-title">Title</Label><Input id="close-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div><div><Label htmlFor="close-owner">Owner role</Label><Input id="close-owner" value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)} /></div><div><Label htmlFor="close-due">Due date</Label><Input id="close-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div><div className="flex items-end justify-end"><Button onClick={() => createTask.mutate()} disabled={!title.trim() || createTask.isPending}>{createTask.isPending ? "Creating..." : "Create task"}</Button></div></div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Close checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">{tasks.map((task) => <div key={task.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{task.title}</p><Badge tone={tone(task.status)}>{task.status.replaceAll("_", " ")}</Badge></div><div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground"><span>Owner: {task.owner_role}</span><span>Due: {task.due_date || "-"}</span><span>Period: {task.period_start} to {task.period_end}</span></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}>Start</Button><Button onClick={() => updateTask.mutate({ id: task.id, status: "done" })}>Done</Button><Button variant="ghost" onClick={() => updateTask.mutate({ id: task.id, status: "blocked" })}>Block</Button></div></div></div>)}</CardContent>
      </Card>
    </div>
  );
}
