"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function entityLink(record: AuditRecord) {
  if (!record.entity_id) return null;

  const byEntity: Record<string, string> = {
    customer: `/customers/${record.entity_id}`,
    vendor: `/vendors/${record.entity_id}`,
    invoice: `/invoices/${record.entity_id}`,
    bill: `/bills/${record.entity_id}`,
    expense: `/expenses/${record.entity_id}`,
    payment: `/payments`,
    bank_account: `/bank-accounts/${record.entity_id}`,
    internal_transfer: `/transfers`,
    company: "/settings/company",
    template_settings: "/templates"
  };

  return byEntity[record.entity_type] ?? null;
}

export function AuditTrailWorkspace() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const audits = useQuery({
    queryKey: ["audit-trail-raw"],
    queryFn: async () => {
      const response = await fetch("/api/audit-logs", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { data?: AuditRecord[]; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Audit trail could not be loaded.");
      }
      return payload.data;
    }
  });

  const records = useMemo(() => {
    const rows = audits.data ?? [];
    const lowered = search.trim().toLowerCase();
    return rows.filter((record) => {
      if (actionFilter !== "all" && record.action !== actionFilter) return false;
      if (entityFilter !== "all" && record.entity_type !== entityFilter) return false;
      if (!lowered) return true;
      return [record.action, record.entity_type, record.entity_id ?? "", record.user_id ?? "", JSON.stringify(record.new_values ?? {}), JSON.stringify(record.old_values ?? {})]
        .join(" ")
        .toLowerCase()
        .includes(lowered);
    });
  }, [actionFilter, audits.data, entityFilter, search]);

  const createCount = useMemo(() => records.filter((record) => record.action === "create").length, [records]);
  const updateCount = useMemo(() => records.filter((record) => record.action === "update").length, [records]);
  const deleteCount = useMemo(() => records.filter((record) => record.action === "delete").length, [records]);
  const recentActors = useMemo(() => new Set(records.map((record) => record.user_id).filter(Boolean)).size, [records]);
  const entityOptions = useMemo(() => ["all", ...Array.from(new Set((audits.data ?? []).map((record) => record.entity_type))).sort()], [audits.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Filtered records</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{records.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Create events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{createCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Update / delete</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{updateCount + deleteCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active users in view</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{recentActors}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Audit controls</CardTitle>
            <p className="text-sm text-muted-foreground">Filter by action and entity family before reviewing sensitive changes or demoing traceability.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href="/settings/company">Company settings</Link></Button>
            <Button asChild variant="secondary"><Link href="/templates">Templates</Link></Button>
            <Button asChild variant="secondary"><Link href="/transfers">Transfers</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit trail" />
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="review">Review</option>
          </select>
          <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            {entityOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All entities" : option}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audits.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading audit trail...</div> : null}
          {audits.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(audits.error as Error).message}</div> : null}
          {!audits.isLoading && !audits.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No audit records found for the current filters.</div> : null}
          {records.map((record) => {
            const href = entityLink(record);
            return (
              <div key={record.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.entity_type}</p>
                      <Badge tone={record.action === "create" ? "success" : record.action === "delete" ? "danger" : "info"}>{record.action}</Badge>
                      {href ? <Link href={href} className="text-xs text-primary underline underline-offset-2">Open entity</Link> : null}
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
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
