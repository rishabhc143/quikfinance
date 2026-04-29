"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getEntityHref, getEntityLabel } from "@/lib/workspace-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RawInsight = {
  id: string;
  insight_type: string;
  title: string;
  summary: string;
  severity: string;
  status: string;
  source_payload: unknown;
  created_at: string;
  updated_at?: string;
};

type CopilotPayload = {
  metrics: { open_insights: number; critical_insights: number; accepted_insights: number; dismissed_insights: number };
  insights: RawInsight[];
};

type NormalizedInsight = RawInsight & {
  confidence: number | null;
  businessImpact: string | null;
  reason: string | null;
  entityType: string | null;
  entityId: string | null;
  entityHref: string | null;
  recommendedActions: Array<{ label: string; href: string }>;
};

function tone(value: string) {
  if (["accepted", "resolved"].includes(value)) return "success" as const;
  if (["critical"].includes(value)) return "danger" as const;
  if (["dismissed"].includes(value)) return "muted" as const;
  return "warning" as const;
}

function normalizeInsight(insight: RawInsight): NormalizedInsight {
  const payload = (typeof insight.source_payload === "object" && insight.source_payload !== null ? insight.source_payload : {}) as Record<string, unknown>;
  const entityType = typeof payload.entity_type === "string" ? payload.entity_type : typeof payload.entityType === "string" ? payload.entityType : null;
  const entityId = typeof payload.entity_id === "string" ? payload.entity_id : typeof payload.entityId === "string" ? payload.entityId : null;
  const entityHref = typeof payload.href === "string" ? payload.href : getEntityHref(entityType, entityId);
  const confidence = typeof payload.confidence === "number" ? payload.confidence : typeof payload.confidence_score === "number" ? payload.confidence_score : null;
  const businessImpact = typeof payload.business_impact === "string" ? payload.business_impact : typeof payload.impact === "string" ? payload.impact : null;
  const reason = typeof payload.reason === "string" ? payload.reason : typeof payload.explanation === "string" ? payload.explanation : null;
  const recommendedActions = Array.isArray(payload.recommended_actions)
    ? payload.recommended_actions
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const label = typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label : null;
          const href = typeof (item as { href?: unknown }).href === "string" ? (item as { href: string }).href : null;
          return label && href ? { label, href } : null;
        })
        .filter((item): item is { label: string; href: string } => Boolean(item))
    : entityHref
      ? [{ label: `Open ${getEntityLabel(entityType)}`, href: entityHref }]
      : [];

  return { ...insight, confidence, businessImpact, reason, entityType, entityId, entityHref, recommendedActions };
}

export function FinanceCopilotWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const overview = useQuery({
    queryKey: ["finance-copilot-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/finance-copilot", { cache: "no-store" });
      const payload = (await response.json()) as { data?: CopilotPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Finance copilot overview could not be loaded.");
      return payload.data;
    }
  });

  const updateInsight = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/v1/workflows/finance-copilot/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Insight update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance-copilot-overview"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Insight update failed.")
  });

  const insights = useMemo(() => (overview.data?.insights ?? []).map(normalizeInsight), [overview.data?.insights]);
  const types = useMemo(() => ["all", ...Array.from(new Set(insights.map((insight) => insight.insight_type))).sort()], [insights]);
  const filteredInsights = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return insights.filter((insight) => {
      if (statusFilter !== "all" && insight.status !== statusFilter) return false;
      if (severityFilter !== "all" && insight.severity !== severityFilter) return false;
      if (typeFilter !== "all" && insight.insight_type !== typeFilter) return false;
      if (!lowered) return true;
      return [insight.title, insight.summary, insight.businessImpact ?? "", insight.reason ?? "", insight.insight_type]
        .join(" ")
        .toLowerCase()
        .includes(lowered);
    });
  }, [insights, search, severityFilter, statusFilter, typeFilter]);

  const actionableCount = useMemo(() => filteredInsights.filter((insight) => insight.status === "open").length, [filteredInsights]);
  const explainedCount = useMemo(() => filteredInsights.filter((insight) => insight.reason).length, [filteredInsights]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open insights</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.open_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Critical</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.critical_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Accepted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.accepted_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Dismissed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.dismissed_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Actionable in view</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{actionableCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Explained in view</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{explainedCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Insight controls</CardTitle>
            <p className="text-sm text-muted-foreground">Filter by topic, severity, and status before reviewing suggested actions.</p>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search insights" className="lg:max-w-xs" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="accepted">Accepted</option>
            <option value="dismissed">Dismissed</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            {types.map((type) => <option key={type} value={type}>{type === "all" ? "All insight types" : type}</option>)}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Insight queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {filteredInsights.map((insight) => (
            <div key={insight.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{insight.title}</p>
                    <Badge tone={tone(insight.severity)}>{insight.severity}</Badge>
                    <Badge tone={tone(insight.status)}>{insight.status}</Badge>
                    <Badge tone="muted">{insight.insight_type}</Badge>
                    {insight.entityHref ? <Link href={insight.entityHref} className="text-xs text-primary underline underline-offset-2">Open {getEntityLabel(insight.entityType)}</Link> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.summary}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Confidence</div>
                      <div className="mt-1 font-medium">{insight.confidence === null ? "Not provided" : `${Math.round(insight.confidence)}%`}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Business impact</div>
                      <div className="mt-1 font-medium">{insight.businessImpact ?? "Needs operator judgement"}</div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Updated</div>
                      <div className="mt-1 font-medium">{new Date(insight.updated_at ?? insight.created_at).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Why this insight exists</div>
                    <div className="mt-1 text-muted-foreground">{insight.reason ?? "No explicit reasoning payload was provided; review the linked source and summary before acting."}</div>
                  </div>
                  {insight.recommendedActions.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Recommended actions</div>
                      <div className="flex flex-wrap gap-2">
                        {insight.recommendedActions.map((action) => (
                          <Button key={`${insight.id}-${action.label}`} asChild variant="secondary">
                            <Link href={action.href}>{action.label}</Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {insight.status !== "accepted" ? <Button variant="secondary" onClick={() => updateInsight.mutate({ id: insight.id, status: "accepted" })}>Accept</Button> : null}
                  {insight.status !== "dismissed" ? <Button variant="ghost" onClick={() => updateInsight.mutate({ id: insight.id, status: "dismissed" })}>Dismiss</Button> : null}
                  {insight.status !== "resolved" ? <Button onClick={() => updateInsight.mutate({ id: insight.id, status: "resolved" })}>Resolve</Button> : null}
                  {insight.status !== "open" ? <Button variant="secondary" onClick={() => updateInsight.mutate({ id: insight.id, status: "open" })}>Re-open</Button> : null}
                </div>
              </div>
            </div>
          ))}
          {filteredInsights.length === 0 && !overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No insights match the current filters.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

