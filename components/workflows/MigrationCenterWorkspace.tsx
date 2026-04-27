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

type MigrationRecord = {
  id: string;
  source_type: string;
  entity_type: string;
  file_name?: string | null;
  status: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
};

export function MigrationCenterWorkspace() {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState("tally");
  const [entityType, setEntityType] = useState("trial_balance");
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState("0");

  const batches = useQuery({
    queryKey: ["workflow-migration-center"],
    queryFn: async () => {
      const response = await fetch("/api/v1/workflows/migration-center");
      const payload = (await response.json()) as { data?: { records?: MigrationRecord[] }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Migration batches could not be loaded.");
      }
      return payload.data?.records ?? [];
    }
  });

  const createBatch = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/migration-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          entity_type: entityType,
          file_name: fileName || null,
          total_rows: Number(totalRows || 0)
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Migration batch could not be created.");
      }
    },
    onSuccess: async () => {
      setFileName("");
      setTotalRows("0");
      toast.success("Migration batch created.");
      await queryClient.invalidateQueries({ queryKey: ["workflow-migration-center"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Migration batch could not be created.");
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "ready" | "imported" | "failed" }) => {
      const response = await fetch(`/api/v1/workflows/migration-center/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Migration batch could not be updated.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workflow-migration-center"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Migration batch could not be updated.");
    }
  });

  const metrics = useMemo(() => {
    const rows = batches.data ?? [];
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === "ready").length,
      imported: rows.reduce((sum, row) => sum + Number(row.imported_rows ?? 0), 0),
      failed: rows.reduce((sum, row) => sum + Number(row.failed_rows ?? 0), 0)
    };
  }, [batches.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Batches</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Ready to import</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.ready}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Imported rows</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.imported}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Failed rows</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.failed}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Migration Queue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(batches.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No migration batches yet. Create a Tally, Zoho Books, or CSV import batch.</div>
            ) : (
              (batches.data ?? []).map((batch) => (
                <div key={batch.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{batch.source_type} · {batch.entity_type}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{batch.file_name || "No file name"} · {batch.total_rows} rows</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={batch.status === "imported" ? "success" : batch.status === "failed" ? "warning" : "info"}>{batch.status}</Badge>
                      {batch.status !== "ready" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: batch.id, status: "ready" })}>Mark ready</Button> : null}
                      {batch.status !== "imported" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: batch.id, status: "imported" })}>Mark imported</Button> : null}
                      {batch.status !== "failed" ? <Button variant="secondary" onClick={() => updateStatus.mutate({ id: batch.id, status: "failed" })}>Mark failed</Button> : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Migration Batch</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="migration-source">Source</Label><select id="migration-source" value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="tally">tally</option><option value="zoho_books">zoho_books</option><option value="csv">csv</option><option value="bank_statement">bank_statement</option><option value="marketplace">marketplace</option></select></div>
              <div><Label htmlFor="migration-entity">Entity type</Label><Input id="migration-entity" value={entityType} onChange={(event) => setEntityType(event.target.value)} placeholder="trial_balance" /></div>
              <div><Label htmlFor="migration-file">File name</Label><Input id="migration-file" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="tally-export.xlsx" /></div>
              <div><Label htmlFor="migration-rows">Total rows</Label><Input id="migration-rows" type="number" value={totalRows} onChange={(event) => setTotalRows(event.target.value)} /></div>
              <Button onClick={() => createBatch.mutate()} disabled={createBatch.isPending}>{createBatch.isPending ? "Creating..." : "Create batch"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Connected Flows</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/imports">Imports</Link></Button>
              <Button asChild variant="secondary"><Link href="/chart-of-accounts">Chart of accounts</Link></Button>
              <Button asChild variant="secondary"><Link href="/reports/trial-balance">Trial balance</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
