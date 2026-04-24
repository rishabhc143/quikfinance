"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CopilotPayload = {
  metrics: { open_insights: number; critical_insights: number; accepted_insights: number; dismissed_insights: number };
  insights: Array<{ id: string; insight_type: string; title: string; summary: string; severity: string; status: string; source_payload: unknown; created_at: string }>;
};

function tone(value: string) {
  if (["accepted", "resolved"].includes(value)) return "success" as const;
  if (["critical"].includes(value)) return "danger" as const;
  if (["dismissed"].includes(value)) return "muted" as const;
  return "warning" as const;
}

export function FinanceCopilotWorkspace() {
  const queryClient = useQueryClient();
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

  const insights = useMemo(() => overview.data?.insights ?? [], [overview.data?.insights]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open insights</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.open_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Critical</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.critical_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Accepted</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.accepted_insights ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Dismissed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.dismissed_insights ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Insight queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">{insights.map((insight) => <div key={insight.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{insight.title}</p><Badge tone={tone(insight.severity)}>{insight.severity}</Badge><Badge tone={tone(insight.status)}>{insight.status}</Badge></div><p className="text-sm text-muted-foreground">{insight.summary}</p><div className="text-sm text-muted-foreground">{new Date(insight.created_at).toLocaleString("en-IN")} ? {insight.insight_type}</div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => updateInsight.mutate({ id: insight.id, status: "accepted" })}>Accept</Button><Button variant="ghost" onClick={() => updateInsight.mutate({ id: insight.id, status: "dismissed" })}>Dismiss</Button><Button onClick={() => updateInsight.mutate({ id: insight.id, status: "resolved" })}>Resolve</Button></div></div></div>)}</CardContent>
      </Card>
    </div>
  );
}
