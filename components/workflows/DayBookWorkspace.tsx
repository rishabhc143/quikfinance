"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type JournalEntry = {
  id: string;
  entry_number: string | null;
  entry_date: string;
  memo: string | null;
  status: string;
  source_type: string | null;
};

type AuditRecord = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  new_values: Record<string, unknown> | null;
};

async function readData<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? fallback);
  }
  return payload.data;
}

function sameDay(left: string, right: string) {
  return left.slice(0, 10) === right;
}

function displaySource(sourceType: string | null) {
  return String(sourceType ?? "manual").replaceAll("_", " ");
}

function readNote(record: AuditRecord) {
  const note = record.new_values?.note;
  return typeof note === "string" && note.trim().length > 0 ? note : "Review note logged.";
}

export function DayBookWorkspace() {
  const today = new Date().toISOString().slice(0, 10);
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const journalQuery = useQuery({
    queryKey: ["day-book-journals"],
    queryFn: async () => {
      const response = await fetch("/api/v1/journal-entries?per_page=40", { cache: "no-store" });
      return readData<JournalEntry[]>(response, "Journal entries could not be loaded.");
    }
  });

  const auditQuery = useQuery({
    queryKey: ["day-book-audits"],
    queryFn: async () => {
      const response = await fetch("/api/audit-logs", { cache: "no-store" });
      return readData<AuditRecord[]>(response, "Day book activity could not be loaded.");
    }
  });

  const createReview = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/day-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          entity_type: "day_book",
          new_values: { note }
        })
      });
      await readData(response, "Day book review could not be logged.");
    },
    onSuccess: async () => {
      setNote("");
      toast.success("Day book review logged.");
      await queryClient.invalidateQueries({ queryKey: ["day-book-audits"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Day book review could not be logged.")
  });

  const entries = useMemo(() => journalQuery.data ?? [], [journalQuery.data]);
  const audits = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const reviewNotes = useMemo(
    () => audits.filter((record) => record.entity_type === "day_book" || (record.action === "review" && record.entity_type.includes("day"))),
    [audits]
  );
  const todayEntries = useMemo(() => entries.filter((entry) => sameDay(entry.entry_date, today)), [entries, today]);
  const postedToday = useMemo(() => todayEntries.filter((entry) => entry.status === "posted"), [todayEntries]);
  const pendingReview = useMemo(() => entries.filter((entry) => ["draft", "submitted", "approved"].includes(entry.status)).slice(0, 8), [entries]);
  const sourceMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of todayEntries) {
      const key = displaySource(entry.source_type);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4);
  }, [todayEntries]);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Day Book"
        description="Review today's posted activity, clear pending journals, and leave a daily close note before period close."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted today</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{postedToday.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending journals</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{pendingReview.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Source types today</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{sourceMix.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Review notes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reviewNotes.length}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Daily close control</CardTitle>
              <p className="text-sm text-muted-foreground">Log the close note after reviewing journals, invoices, bills, and payment postings.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href="/journal-entries">Journal entries</Link></Button>
              <Button asChild variant="secondary"><Link href="/audit-trail">Audit trail</Link></Button>
              <Button asChild><Link href="/journal-entries/new">New entry</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="day-book-note">Close note</Label>
              <Input
                id="day-book-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Daily close reviewed. Pending items escalated before cutoff."
              />
            </div>
            <Button onClick={() => createReview.mutate()} disabled={createReview.isPending || !note.trim()}>
              {createReview.isPending ? "Logging..." : "Log daily close note"}
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {sourceMix.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No day-book activity for today yet.</div> : null}
              {sourceMix.map(([label, count]) => (
                <div key={label} className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-medium capitalize">{label}</span>
                    <Badge tone="info">{count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {journalQuery.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading journals...</div> : null}
            {journalQuery.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(journalQuery.error as Error).message}</div> : null}
            {!journalQuery.isLoading && !journalQuery.isError && pendingReview.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No draft or submitted journals are waiting on the day-book review queue.</div>
            ) : null}
            {pendingReview.map((entry) => (
              <div key={entry.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{entry.entry_number ?? entry.id}</div>
                    <div className="text-sm text-muted-foreground">{entry.entry_date} - {displaySource(entry.source_type)}</div>
                    <div className="text-sm">{entry.memo ?? "No memo provided."}</div>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today journal activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEntries.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No journals were posted or drafted today.</div> : null}
            {todayEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold">{entry.entry_number ?? entry.id}</div>
                    <div className="text-sm text-muted-foreground">{displaySource(entry.source_type)} - {entry.entry_date}</div>
                    <div className="text-sm">{entry.memo ?? "No memo provided."}</div>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent close notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditQuery.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading review notes...</div> : null}
            {auditQuery.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(auditQuery.error as Error).message}</div> : null}
            {!auditQuery.isLoading && !auditQuery.isError && reviewNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No day-book review notes logged yet.</div>
            ) : null}
            {reviewNotes.slice(0, 8).map((record) => (
              <div key={record.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="warning">review</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(record.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-3 text-sm">{readNote(record)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
