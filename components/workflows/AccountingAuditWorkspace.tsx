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

type AuditVariant = "day-book" | "ledgers";

function renderJson(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function matchesVariant(record: AuditRecord, variant: AuditVariant) {
  if (variant === "day-book") {
    return ["create", "update", "delete", "review", "post"].includes(record.action);
  }
  return record.entity_type.includes("account") || record.entity_type.includes("journal") || record.entity_type.includes("ledger") || record.action === "review";
}

export function AccountingAuditWorkspace({ variant }: { variant: AuditVariant }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");

  const audits = useQuery({
    queryKey: [variant, search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/${variant}${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? `${variant} could not be loaded.`);
      return payload.data;
    }
  });

  const createReview = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/workflows/${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          entity_type: variant === "day-book" ? "day_book" : "ledger_review",
          new_values: { note }
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Review note could not be logged.");
    },
    onSuccess: async () => {
      toast.success(variant === "day-book" ? "Day book review logged." : "Ledger review logged.");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: [variant] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Review note could not be logged.")
  });

  const records = useMemo(() => (audits.data?.records ?? []).filter((record) => matchesVariant(record, variant)), [audits.data?.records, variant]);
  const createCount = useMemo(() => records.filter((record) => record.action === "create").length, [records]);
  const updateCount = useMemo(() => records.filter((record) => record.action === "update").length, [records]);
  const reviewCount = useMemo(() => records.filter((record) => record.action === "review").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Entries</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{records.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Create events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{createCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Update events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{updateCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Review notes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reviewCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{variant === "day-book" ? "Log day book review" : "Log ledger review"}</CardTitle>
          <Button asChild variant="secondary"><Link href={variant === "day-book" ? "/journal-entries" : "/chart-of-accounts"}>{variant === "day-book" ? "Open Journal Entries" : "Open Chart of Accounts"}</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor={`${variant}-note`}>Review note</Label>
              <Input id={`${variant}-note`} value={note} onChange={(event) => setNote(event.target.value)} placeholder={variant === "day-book" ? "Daily close reviewed, no blocking issues." : "Ledger balances reviewed for suspense and posting gaps."} />
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={() => createReview.mutate()} disabled={createReview.isPending || !note.trim()}>
                {createReview.isPending ? "Logging..." : "Log review"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{variant === "day-book" ? "Day book activity" : "Ledger activity"}</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={variant === "day-book" ? "Search day book" : "Search ledgers"} className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {audits.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading activity...</div> : null}
          {audits.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(audits.error as Error).message}</div> : null}
          {!audits.isLoading && !audits.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No activity found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{record.entity_type}</p>
                  <Badge tone={record.action === "review" ? "warning" : "info"}>{record.action}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>ID: {record.entity_id || "-"}</span>
                  <span>User: {record.user_id || "-"}</span>
                  <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                </div>
                <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">{renderJson(record.new_values)}</pre>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
