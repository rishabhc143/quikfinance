"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuditRecord = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  old_values: unknown;
  new_values: unknown;
};

type WorkflowResponse = {
  records: AuditRecord[];
  total: number;
};

function renderJson(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
    return "-";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditTrailWorkspace() {
  const [search, setSearch] = useState("");

  const audits = useQuery({
    queryKey: ["audit-trail", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/audit-trail${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Audit trail could not be loaded.");
      }
      return payload.data;
    }
  });

  const records = useMemo(() => audits.data?.records ?? [], [audits.data?.records]);
  const createCount = useMemo(() => records.filter((record) => record.action === "create").length, [records]);
  const updateCount = useMemo(() => records.filter((record) => record.action === "update").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Audit records</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{audits.data?.total ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Create events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{createCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Update events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{updateCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Audit log</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit trail" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {audits.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading audit trail...</div> : null}
          {audits.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(audits.error as Error).message}</div> : null}
          {!audits.isLoading && !audits.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No audit records found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.entity_type}</p>
                    <Badge tone="info">{record.action}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>ID: {record.entity_id || "-"}</span>
                    <span>User: {record.user_id || "-"}</span>
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Old values</p>
                      <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">{renderJson(record.old_values)}</pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">New values</p>
                      <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">{renderJson(record.new_values)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
