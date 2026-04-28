"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type ProjectOption = { id: string; name: string };

export function TimeEntryEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [workDate, setWorkDate] = useState(todayISO());
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(0);
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [isBilled, setIsBilled] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [projectRes, entryRes] = await Promise.all([
          fetch("/api/v1/projects", { signal: controller.signal }),
          editId ? fetch(`/api/v1/time-entries/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const projectJson = await projectRes.json().catch(() => ({ data: [] }));
        setProjects(Array.isArray(projectJson.data) ? projectJson.data : []);
        if (entryRes) {
          const entryJson = await entryRes.json().catch(() => ({}));
          if (!entryRes.ok) throw new Error(entryJson.error?.message ?? "Time entry could not be loaded.");
          const entry = entryJson.data ?? {};
          setProjectId(String(entry.project_id ?? ""));
          setWorkDate(String(entry.work_date ?? todayISO()));
          setHours(Number(entry.hours ?? 1));
          setRate(Number(entry.rate ?? 0));
          setDescription(String(entry.description ?? ""));
          setIsBillable(Boolean(entry.is_billable));
          setIsBilled(Boolean(entry.is_billed));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Time entry could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const entryValue = useMemo(() => Number((hours * rate).toFixed(2)), [hours, rate]);

  const submit = async () => {
    if (!projectId || !description.trim() || hours <= 0) {
      toast.error("Project, description, and hours are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/time-entries/${editId}` : "/api/v1/time-entries", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          work_date: workDate,
          hours,
          rate,
          description,
          is_billable: isBillable,
          is_billed: isBilled
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Time entry could not be saved.");
      toast.success("Time entry saved.");
      router.push(json.data?.id ? `/time-tracking/${json.data.id}` : "/time-tracking");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Time entry could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading time entry editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit time entry" : "New time entry"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Project</Label>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href="/projects/new" className="text-primary underline underline-offset-2">New project</Link>
              {projectId ? <Link href={`/projects/${projectId}`} className="text-muted-foreground underline underline-offset-2">Open project</Link> : null}
            </div>
          </div>
          <div>
            <Label>Work date</Label>
            <Input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Hours</Label>
            <Input type="number" step="0.25" value={hours} onChange={(event) => setHours(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Rate</Label>
            <Input type="number" step="0.01" value={rate} onChange={(event) => setRate(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" />
          </div>
          <div className="flex items-end gap-3">
            <input id="is_billable" type="checkbox" checked={isBillable} onChange={(event) => setIsBillable(event.target.checked)} className="h-4 w-4 rounded border-input accent-sky-600" />
            <Label htmlFor="is_billable">Billable</Label>
          </div>
          <div className="flex items-end gap-3">
            <input id="is_billed" type="checkbox" checked={isBilled} onChange={(event) => setIsBilled(event.target.checked)} className="h-4 w-4 rounded border-input accent-sky-600" />
            <Label htmlFor="is_billed">Already billed</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Entry value</span><span>{formatMoney(entryValue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Billing state</span><span>{isBillable ? (isBilled ? "billed" : "ready") : "non-billable"}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/time-tracking")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save time entry"}</Button>
      </div>
    </div>
  );
}
