"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WorkflowRecord = Record<string, unknown> & { id?: string };

type WorkflowResponse = {
  resource: { key: string; title: string };
  records: WorkflowRecord[];
  total: number;
};

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function recordTitle(record: WorkflowRecord) {
  return stringifyValue(record.title ?? record.name ?? record.file_name ?? record.settlement_id ?? record.bill_number ?? record.code ?? record.action ?? record.id);
}

function recordStatus(record: WorkflowRecord) {
  return stringifyValue(record.status ?? record.match_status ?? record.severity ?? record.priority ?? "open");
}

export function OperationalRecordsPanel({ workflowKey }: { workflowKey: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["workflow-records", workflowKey];
  const records = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/${workflowKey}`);
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Workflow records could not be loaded.");
      }
      return payload.data;
    }
  });

  const createSample = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/workflows/${workflowKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Workflow record could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success("Workflow record created");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Workflow record could not be created.");
    }
  });

  const visibleRecords = useMemo(() => records.data?.records ?? [], [records.data?.records]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Live Backend Records</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.data?.resource.title ?? "Operational workflow"} data is stored tenant-wise in Supabase.
          </p>
        </div>
        <Button onClick={() => createSample.mutate()} disabled={createSample.isPending}>
          {createSample.isPending ? "Creating..." : "Create sample record"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.isLoading ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading live workflow records...</div>
        ) : records.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {records.error instanceof Error ? records.error.message : "Workflow records could not be loaded."}
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            No live records yet. Create a sample record to verify the end-to-end database/API flow.
          </div>
        ) : (
          visibleRecords.slice(0, 8).map((record) => (
            <div key={record.id ?? recordTitle(record)} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{recordTitle(record)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stringifyValue(record.description ?? record.summary ?? record.category ?? record.entity_type ?? record.created_at)}
                  </p>
                </div>
                <Badge tone="info">{recordStatus(record)}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
