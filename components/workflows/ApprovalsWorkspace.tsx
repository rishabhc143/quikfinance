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
import { formatMoney } from "@/lib/utils/currency";

type ApprovalRecord = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  priority: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  assigned_role: string;
  created_at: string;
};

type WorkflowResponse = {
  records: ApprovalRecord[];
  total: number;
};

function priorityTone(priority: string) {
  if (priority === "critical") return "danger" as const;
  if (priority === "high") return "warning" as const;
  return "info" as const;
}

function statusTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected" || status === "cancelled") return "danger" as const;
  return "warning" as const;
}

export function ApprovalsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [priority, setPriority] = useState("normal");
  const [assignedRole, setAssignedRole] = useState("owner");

  const approvals = useQuery({
    queryKey: ["approvals", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/approvals${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Approvals could not be loaded.");
      }
      return payload.data;
    }
  });

  const createApproval = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          amount: Number(amount || 0),
          priority,
          assigned_role: assignedRole,
          status: "pending"
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Approval request could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success("Approval request created.");
      setTitle("");
      setDescription("");
      setAmount("0");
      setPriority("normal");
      setAssignedRole("owner");
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Approval request could not be created.");
    }
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApprovalRecord["status"] }) => {
      const response = await fetch(`/api/v1/workflows/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Approval update failed.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Approval update failed.");
    }
  });

  const records = useMemo(() => approvals.data?.records ?? [], [approvals.data?.records]);
  const pendingCount = useMemo(() => records.filter((record) => record.status === "pending").length, [records]);
  const highPriorityCount = useMemo(() => records.filter((record) => ["high", "critical"].includes(record.priority)).length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{pendingCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">High priority</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{highPriorityCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total requests</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{approvals.data?.total ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create approval request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="approval-title">Title</Label>
              <Input id="approval-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="approval-amount">Amount</Label>
              <Input id="approval-amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="approval-priority">Priority</Label>
              <select id="approval-priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <Label htmlFor="approval-role">Assigned role</Label>
              <select id="approval-role" value={assignedRole} onChange={(event) => setAssignedRole(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="approval-description">Description</Label>
              <Textarea id="approval-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createApproval.mutate()} disabled={!title.trim() || createApproval.isPending}>
                {createApproval.isPending ? "Creating..." : "Create approval"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Approval queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search approvals" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {approvals.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading approvals...</div> : null}
          {approvals.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(approvals.error as Error).message}</div> : null}
          {!approvals.isLoading && !approvals.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No approval requests found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.title}</p>
                    <Badge tone={priorityTone(record.priority)}>{record.priority}</Badge>
                    <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{record.description || "-"}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{formatMoney(record.amount)}</span>
                    <span>Assigned: {record.assigned_role}</span>
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status === "pending" ? (
                    <>
                      <Button variant="secondary" onClick={() => updateApproval.mutate({ id: record.id, status: "approved" })}>Approve</Button>
                      <Button variant="destructive" onClick={() => updateApproval.mutate({ id: record.id, status: "rejected" })}>Reject</Button>
                    </>
                  ) : null}
                  {record.status !== "cancelled" && record.status !== "approved" ? (
                    <Button variant="ghost" onClick={() => updateApproval.mutate({ id: record.id, status: "cancelled" })}>Cancel</Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
