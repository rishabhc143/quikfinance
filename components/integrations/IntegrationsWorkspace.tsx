"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type OverviewPayload = {
  configured: boolean;
  webhook_url: string;
  metrics: {
    payment_links_total: number;
    payment_links_open: number;
    gateway_events_pending: number;
    import_jobs_with_warnings: number;
    bank_feeds_pending: number;
  };
  recent_payment_links: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    amount_paid: number;
    created_at: string;
  }>;
  recent_gateway_events: Array<{
    id: string;
    provider: string;
    event_type: string;
    processed_at: string | null;
    created_at: string;
  }>;
  recent_import_jobs: Array<{
    id: string;
    source_type: string;
    entity_type: string;
    status: string;
    imported_rows: number;
    failed_rows: number;
    created_at: string;
  }>;
  recent_bank_feeds: Array<{
    id: string;
    feed_name: string;
    source_type: string;
    status: string;
    imported_on: string;
    line_count: number;
  }>;
};

function toneForStatus(status: string) {
  if (["active", "configured", "reconciled", "processed", "generated", "completed"].includes(status)) {
    return "success" as const;
  }
  if (["warning", "pending_review", "processing", "partially_paid", "issued"].includes(status)) {
    return "warning" as const;
  }
  if (["error", "failed", "cancelled"].includes(status)) {
    return "danger" as const;
  }
  return "info" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function IntegrationsWorkspace() {
  const overview = useQuery({
    queryKey: ["integrations-overview"],
    queryFn: async () => {
      const response = await fetch("/api/v1/integrations/overview", { cache: "no-store" });
      const payload = (await response.json()) as { data?: OverviewPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Integrations overview could not be loaded.");
      }
      return payload.data;
    }
  });

  const data = overview.data;

  const copyWebhook = async () => {
    if (!data?.webhook_url) {
      return;
    }

    await navigator.clipboard.writeText(data.webhook_url);
    toast.success("Webhook URL copied.");
  };

  if (overview.isLoading) {
    return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Loading integrations...</div>;
  }

  if (overview.isError || !data) {
    return <div className="rounded-lg border border-destructive/30 bg-card p-5 text-sm text-destructive">{(overview.error as Error).message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Gateway status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge tone={data.configured ? "success" : "warning"}>{data.configured ? "Configured" : "Pending setup"}</Badge>
            <p className="text-sm text-muted-foreground">Razorpay credential and webhook readiness.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Open payment links</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.metrics.payment_links_open}</p>
            <p className="mt-2 text-sm text-muted-foreground">{data.metrics.payment_links_total} total links created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pending gateway events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.metrics.gateway_events_pending}</p>
            <p className="mt-2 text-sm text-muted-foreground">Webhook events awaiting processed timestamp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Import / bank issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.metrics.import_jobs_with_warnings + data.metrics.bank_feeds_pending}</p>
            <p className="mt-2 text-sm text-muted-foreground">{data.metrics.import_jobs_with_warnings} import warnings, {data.metrics.bank_feeds_pending} bank feeds pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Razorpay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Webhook URL</p>
              <div className="mt-1 rounded-md border bg-muted/40 p-3 font-mono text-[11px]">{data.webhook_url}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyWebhook}>Copy webhook URL</Button>
              <Button variant="secondary" asChild>
                <Link href="/payment-gateways">Open payment gateways</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/payment-operations">Open payment operations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" asChild>
              <Link href="/invoices">Invoices</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/payments/received">Payments received</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/imports">Imports</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/bank-feeds">Bank feeds</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent payment links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_payment_links.length === 0 ? <p className="text-sm text-muted-foreground">No payment links yet.</p> : null}
            {data.recent_payment_links.map((link) => (
              <div key={link.id} className="rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{link.provider}</p>
                    <p className="text-muted-foreground">{formatDate(link.created_at)}</p>
                  </div>
                  <Badge tone={toneForStatus(link.status)}>{link.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{formatMoney(link.amount)} created ? {formatMoney(link.amount_paid)} collected</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent gateway events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_gateway_events.length === 0 ? <p className="text-sm text-muted-foreground">No gateway events yet.</p> : null}
            {data.recent_gateway_events.map((event) => (
              <div key={event.id} className="rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{event.event_type}</p>
                    <p className="text-muted-foreground">{formatDate(event.created_at)}</p>
                  </div>
                  <Badge tone={event.processed_at ? "success" : "warning"}>{event.processed_at ? "processed" : "pending"}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">Provider: {event.provider}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent imports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_import_jobs.length === 0 ? <p className="text-sm text-muted-foreground">No import jobs yet.</p> : null}
            {data.recent_import_jobs.map((job) => (
              <div key={job.id} className="rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{job.source_type} ? {job.entity_type}</p>
                    <p className="text-muted-foreground">{formatDate(job.created_at)}</p>
                  </div>
                  <Badge tone={toneForStatus(job.status)}>{job.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{job.imported_rows} imported ? {job.failed_rows} failed</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bank feeds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_bank_feeds.length === 0 ? <p className="text-sm text-muted-foreground">No bank feeds yet.</p> : null}
            {data.recent_bank_feeds.map((feed) => (
              <div key={feed.id} className="rounded-xl border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{feed.feed_name}</p>
                    <p className="text-muted-foreground">{feed.source_type} ? {formatDate(feed.imported_on)}</p>
                  </div>
                  <Badge tone={toneForStatus(feed.status)}>{feed.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{feed.line_count.toLocaleString("en-IN")} statement lines</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
