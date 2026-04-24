"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type SettlementsPayload = {
  metrics: { pending_count: number; settlements_count: number; total_net: number; unprocessed_events: number };
  settlements: Array<{ id: string; settlement_id: string; settlement_date: string; gross_amount: number; fee_amount: number; tax_amount: number; net_amount: number; status: string; created_at: string }>;
  events: Array<{ id: string; provider: string; event_type: string; processed_at: string | null; created_at: string }>;
};

function tone(status: string) {
  if (["posted", "matched", "processed"].includes(status)) return "success" as const;
  if (["exception", "failed"].includes(status)) return "danger" as const;
  return "warning" as const;
}

export function SettlementsWorkspace() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["settlements-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/settlements", { cache: "no-store" });
      const payload = (await response.json()) as { data?: SettlementsPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Settlements overview could not be loaded.");
      return payload.data;
    }
  });

  const updateSettlement = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/v1/workflows/payment-operations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Settlement update failed.");
    },
    onSuccess: async () => {
      toast.success("Settlement updated.");
      await queryClient.invalidateQueries({ queryKey: ["settlements-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-operations"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Settlement update failed.")
  });

  const settlements = useMemo(() => overview.data?.settlements ?? [], [overview.data?.settlements]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.pending_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Tracked settlements</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.settlements_count ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total net</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(overview.data?.metrics.total_net ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Unprocessed events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.unprocessed_events ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Settlements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {overview.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading settlements...</div> : null}
          {overview.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(overview.error as Error).message}</div> : null}
          {settlements.map((row) => (
            <div key={row.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{row.settlement_id}</p><Badge tone={tone(row.status)}>{row.status}</Badge></div><div className="flex flex-wrap gap-4 text-sm text-muted-foreground"><span>{row.settlement_date}</span><span>Gross: {formatMoney(row.gross_amount)}</span><span>Net: {formatMoney(row.net_amount)}</span></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => updateSettlement.mutate({ id: row.id, status: "matched" })}>Mark matched</Button><Button onClick={() => updateSettlement.mutate({ id: row.id, status: "posted" })}>Post</Button></div></div></div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent gateway events</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(overview.data?.events ?? []).map((event) => (
            <div key={event.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{event.event_type}</p><p className="text-sm text-muted-foreground">{event.provider} ? {new Date(event.created_at).toLocaleString("en-IN")}</p></div><Badge tone={event.processed_at ? "success" : "warning"}>{event.processed_at ? "processed" : "pending"}</Badge></div></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
