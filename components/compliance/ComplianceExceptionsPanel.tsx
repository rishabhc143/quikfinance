"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExceptionRecord = {
  id: string;
  category?: string | null;
  severity?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at?: string | null;
};

function severityTone(severity: string) {
  if (severity === "critical") return "danger" as const;
  if (severity === "high") return "warning" as const;
  if (severity === "medium") return "info" as const;
  return "muted" as const;
}

export function ComplianceExceptionsPanel({
  title,
  entityType,
  detailBasePath
}: {
  title: string;
  entityType: string;
  detailBasePath: string;
}) {
  const [rows, setRows] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/workflows/exception-queue?per_page=100", {
          signal: controller.signal,
          cache: "no-store"
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json.error?.message ?? "Compliance blockers could not be loaded.");
        }
        const records = Array.isArray(json.data?.records) ? json.data.records as ExceptionRecord[] : [];
        setRows(records);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Compliance blockers could not be loaded.");
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const blockers = useMemo(() => rows.filter((row) => row.entity_type === entityType && ["open", "in_progress"].includes(String(row.status ?? ""))), [entityType, rows]);
  const criticalCount = useMemo(() => blockers.filter((row) => ["critical", "high"].includes(String(row.severity ?? ""))).length, [blockers]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Open workflow exceptions created by compliance status actions.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/exception-queue">Open queue</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge tone={blockers.length > 0 ? "warning" : "success"}>{blockers.length} open</Badge>
          <Badge tone={criticalCount > 0 ? "danger" : "muted"}>{criticalCount} high priority</Badge>
        </div>
        {loading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Loading blockers...</div> : null}
        {error ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</div> : null}
        {!loading && !error && blockers.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No open blockers for this module.</div> : null}
        {blockers.slice(0, 5).map((row) => (
          <div key={row.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{row.title || row.id}</p>
                  <Badge tone={severityTone(String(row.severity ?? "low"))}>{String(row.severity ?? "low")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.description || "No description provided."}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : ""}</p>
              </div>
              <div className="flex gap-2">
                {row.entity_id ? (
                  <Button asChild>
                    <Link href={`${detailBasePath}/${row.entity_id}`}>Open record</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
