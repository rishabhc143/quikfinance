"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type TimeEntryRecord = {
  id: string;
  project_id: string;
  work_date: string;
  hours: number;
  rate: number;
  description: string;
  is_billable: boolean;
  is_billed: boolean;
};

export function TimeEntryDetail({ id }: { id: string }) {
  const [entry, setEntry] = useState<TimeEntryRecord | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/time-entries/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Time entry could not be loaded.");
        const record = json.data ?? null;
        setEntry(record);
        if (record?.project_id) {
          const projectResponse = await fetch(`/api/v1/projects/${record.project_id}`, { signal: controller.signal });
          const projectJson = await projectResponse.json().catch(() => ({}));
          if (projectResponse.ok) {
            setProjectName(String(projectJson.data?.name ?? ""));
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Time entry could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !entry) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading time entry...</div>;
  }

  const createInvoiceDraft = async () => {
    if (!entry.project_id) return;
    setCreating(true);
    try {
      const response = await fetch("/api/v1/time-entries/invoice-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: entry.project_id, entry_ids: [id] })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Invoice draft could not be created.");
      toast.success("Invoice draft created from this time entry.");
      setEntry((current) => current ? { ...current, is_billed: true } : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice draft could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{projectName || "Project time entry"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/time-tracking/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Work date</span><span>{entry.work_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span>{entry.hours}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span>{formatMoney(entry.rate)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Entry value</span><span>{formatMoney(Number(entry.hours) * Number(entry.rate))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Billable</span><span>{entry.is_billable ? "Yes" : "No"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Already billed</span><span>{entry.is_billed ? "Yes" : "No"}</span></div>
          {entry.project_id ? <div className="flex justify-between md:col-span-2"><span className="text-muted-foreground">Project</span><Link href={`/projects/${entry.project_id}`} className="text-primary underline underline-offset-2">{projectName || entry.project_id}</Link></div> : null}
        </CardContent>
      </Card>
      {entry.is_billable && !entry.is_billed ? (
        <Card>
          <CardHeader><CardTitle>Billing action</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={createInvoiceDraft} disabled={creating}>
              {creating ? "Creating..." : "Create invoice draft"}
            </Button>
            {entry.project_id ? <Button asChild variant="secondary"><Link href={`/projects/${entry.project_id}`}>Open project</Link></Button> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
