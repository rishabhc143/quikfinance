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
import { Textarea } from "@/components/ui/textarea";

type ValidationSummary = {
  columns?: string[];
  warnings?: string[];
  sample_rows?: Array<Record<string, string>>;
  readiness?: string;
  mapping_notes?: string | null;
};

type MigrationRecord = {
  id: string;
  source_type: string;
  entity_type: string;
  file_name?: string | null;
  status: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  validation_summary?: ValidationSummary | null;
};

type MigrationPayload = {
  records: MigrationRecord[];
  summary: {
    total: number;
    ready: number;
    review: number;
    imported: number;
    failed: number;
  };
};

function badgeTone(status: string) {
  if (status === "ready" || status === "imported") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "validating") return "warning" as const;
  return "info" as const;
}

export function MigrationCenterWorkspace() {
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState("tally");
  const [entityType, setEntityType] = useState("trial_balance");
  const [fileName, setFileName] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mappingNotes, setMappingNotes] = useState("");

  const batches = useQuery({
    queryKey: ["migration-center-v2"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/migration-center", { cache: "no-store" });
      const payload = (await response.json()) as { data?: MigrationPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Migration batches could not be loaded.");
      }
      return payload.data;
    }
  });

  const createBatch = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/operations/migration-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          entity_type: entityType,
          file_name: fileName || null,
          payload_text: payloadText,
          notes: notes || null
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Migration batch could not be created.");
      }
    },
    onSuccess: async () => {
      setFileName("");
      setPayloadText("");
      setNotes("");
      toast.success("Migration batch created.");
      await queryClient.invalidateQueries({ queryKey: ["migration-center-v2"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Migration batch could not be created.");
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, mappingNotes }: { id: string; status: "ready" | "imported" | "failed" | "validating"; mappingNotes?: string }) => {
      const response = await fetch(`/api/v1/operations/migration-center/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, mapping_notes: mappingNotes ?? null })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Migration batch could not be updated.");
      }
    },
    onSuccess: async () => {
      toast.success("Migration batch updated.");
      await queryClient.invalidateQueries({ queryKey: ["migration-center-v2"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Migration batch could not be updated.");
    }
  });

  const summary = batches.data?.summary ?? { total: 0, ready: 0, review: 0, imported: 0, failed: 0 };
  const records = useMemo(() => batches.data?.records ?? [], [batches.data?.records]);
  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) ?? null, [records, selectedId]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Batches</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Ready</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.ready}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Needs review</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.review}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Imported rows</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.imported}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Failed rows</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.failed}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Migration queue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {records.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No migration batches yet. Paste a source extract to generate readiness checks and preview mappings.</div>
            ) : (
              records.map((batch) => {
                const warnings = Array.isArray(batch.validation_summary?.warnings) ? batch.validation_summary?.warnings ?? [] : [];
                const columns = Array.isArray(batch.validation_summary?.columns) ? batch.validation_summary?.columns ?? [] : [];
                return (
                  <button key={batch.id} type="button" onClick={() => {
                    setSelectedId(batch.id);
                    setMappingNotes(typeof batch.validation_summary?.mapping_notes === "string" ? batch.validation_summary.mapping_notes : "");
                  }} className="w-full rounded-2xl border p-4 text-left transition hover:border-primary/40">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{batch.source_type} · {batch.entity_type}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{batch.file_name || "No file name"} · {batch.total_rows} rows · {columns.length} columns</p>
                        <p className="mt-2 text-sm text-muted-foreground">Warnings: {warnings.length} · Imported: {batch.imported_rows} · Failed: {batch.failed_rows}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={badgeTone(batch.status)}>{batch.status}</Badge>
                        {batch.status !== "ready" ? <Button variant="secondary" onClick={(event) => { event.stopPropagation(); updateStatus.mutate({ id: batch.id, status: "ready" }); }}>Mark ready</Button> : null}
                        {batch.status !== "imported" ? <Button variant="secondary" onClick={(event) => { event.stopPropagation(); updateStatus.mutate({ id: batch.id, status: "imported" }); }}>Mark imported</Button> : null}
                        {batch.status !== "failed" ? <Button variant="secondary" onClick={(event) => { event.stopPropagation(); updateStatus.mutate({ id: batch.id, status: "failed" }); }}>Mark failed</Button> : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create migration batch</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="migration-source">Source</Label><select id="migration-source" value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="tally">tally</option><option value="zoho_books">zoho_books</option><option value="csv">csv</option><option value="bank_statement">bank_statement</option><option value="marketplace">marketplace</option></select></div>
              <div><Label htmlFor="migration-entity">Entity type</Label><select id="migration-entity" value={entityType} onChange={(event) => setEntityType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="trial_balance">trial_balance</option><option value="customers">customers</option><option value="vendors">vendors</option><option value="invoices">invoices</option><option value="bills">bills</option><option value="payments">payments</option><option value="bank_transactions">bank_transactions</option></select></div>
              <div><Label htmlFor="migration-file">File name</Label><Input id="migration-file" value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="tally-export.csv" /></div>
              <div><Label htmlFor="migration-notes">Batch notes</Label><Input id="migration-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="April opening balance migration" /></div>
              <div><Label htmlFor="migration-payload">Source extract</Label><Textarea id="migration-payload" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} placeholder="Paste CSV or JSON payload to preview mappings and validation warnings." className="min-h-[180px]" /></div>
              <Button onClick={() => createBatch.mutate()} disabled={createBatch.isPending || !payloadText.trim()}>{createBatch.isPending ? "Analyzing..." : "Create batch with preview"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Batch detail</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!selectedRecord ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Select a batch to inspect sample rows, warnings, and mapping notes.</div> : null}
              {selectedRecord ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Readiness:</span> {selectedRecord.validation_summary?.readiness ?? "-"}</div>
                    <div><span className="text-muted-foreground">Columns:</span> {(selectedRecord.validation_summary?.columns ?? []).join(", ") || "-"}</div>
                  </div>
                  <div>
                    <Label htmlFor="mapping-notes">Mapping notes</Label>
                    <Textarea id="mapping-notes" value={mappingNotes} onChange={(event) => setMappingNotes(event.target.value)} className="mt-2 min-h-[100px]" placeholder="Document field mapping decisions or cleanup actions." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => updateStatus.mutate({ id: selectedRecord.id, status: "validating", mappingNotes })}>Save notes</Button>
                    <Button asChild variant="secondary"><Link href="/imports/new">Open import runner</Link></Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Warnings</div>
                    {(selectedRecord.validation_summary?.warnings ?? []).length === 0 ? <div className="text-muted-foreground">No warnings.</div> : null}
                    {(selectedRecord.validation_summary?.warnings ?? []).map((warning) => <div key={warning} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{warning}</div>)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Sample rows</div>
                    {(selectedRecord.validation_summary?.sample_rows ?? []).length === 0 ? <div className="text-muted-foreground">No sample rows.</div> : null}
                    {(selectedRecord.validation_summary?.sample_rows ?? []).map((row, index) => <pre key={index} className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">{JSON.stringify(row, null, 2)}</pre>)}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Connected flows</CardTitle></CardHeader>
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

