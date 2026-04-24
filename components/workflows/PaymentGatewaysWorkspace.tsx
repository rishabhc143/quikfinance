"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type GatewayPayload = {
  configured: boolean;
  webhook_url: string;
  metrics: { connected_gateways: number; unprocessed_events: number; open_payment_links: number; pending_settlements: number };
  events: Array<{ id: string; provider: string; event_type: string; processed_at: string | null; created_at: string }>;
  payment_links: Array<{ id: string; status: string; amount: number; amount_paid: number; created_at: string }>;
  settlements: Array<{ id: string; status: string; net_amount: number; settlement_date: string }>;
};

function tone(value: string, pending = false) {
  if (pending) return "warning" as const;
  if (["processed", "posted", "matched"].includes(value)) return "success" as const;
  if (["failed", "exception"].includes(value)) return "danger" as const;
  return "info" as const;
}

export function PaymentGatewaysWorkspace() {
  const overview = useQuery({
    queryKey: ["payment-gateways-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/operations/payment-gateways", { cache: "no-store" });
      const payload = (await response.json()) as { data?: GatewayPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Payment gateway overview could not be loaded.");
      return payload.data;
    }
  });

  const copied = async () => {
    if (!overview.data?.webhook_url) return;
    await navigator.clipboard.writeText(overview.data.webhook_url);
    toast.success("Webhook URL copied.");
  };

  const totalLinkAmount = useMemo(() => (overview.data?.payment_links ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0), [overview.data?.payment_links]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Connected gateways</CardTitle></CardHeader><CardContent className="flex items-center gap-3"><span className="text-2xl font-bold">{overview.data?.metrics.connected_gateways ?? 0}</span><Badge tone={overview.data?.configured ? "success" : "warning"}>{overview.data?.configured ? "configured" : "pending"}</Badge></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open payment links</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.open_payment_links ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Unprocessed events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.unprocessed_events ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending settlements</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{overview.data?.metrics.pending_settlements ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Gateway configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm"><div className="rounded-md border bg-muted/40 p-3 font-mono text-[11px]">{overview.data?.webhook_url ?? "-"}</div><div className="flex flex-wrap gap-2"><Button onClick={copied}>Copy webhook URL</Button><Button variant="secondary" asChild><Link href="/integrations">Open integrations</Link></Button><Button variant="secondary" asChild><Link href="/payment-operations">Open payment operations</Link></Button></div></CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Recent events</CardTitle></CardHeader><CardContent className="space-y-3">{(overview.data?.events ?? []).map((event) => <div key={event.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{event.event_type}</p><p className="text-sm text-muted-foreground">{event.provider} ? {new Date(event.created_at).toLocaleString("en-IN")}</p></div><Badge tone={tone(event.processed_at ? "processed" : "pending", !event.processed_at)}>{event.processed_at ? "processed" : "pending"}</Badge></div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Payment links</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Tracked amount: {formatMoney(totalLinkAmount)}</p>{(overview.data?.payment_links ?? []).map((link) => <div key={link.id} className="rounded-2xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{formatMoney(link.amount)}</p><p className="text-sm text-muted-foreground">Collected: {formatMoney(link.amount_paid)} ? {new Date(link.created_at).toLocaleString("en-IN")}</p></div><Badge tone={tone(link.status)}>{link.status}</Badge></div></div>)}</CardContent></Card>
      </div>
    </div>
  );
}
