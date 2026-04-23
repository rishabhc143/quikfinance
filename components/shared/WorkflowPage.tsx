import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatMoney } from "@/lib/utils/currency";

export type WorkflowMetric = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "warning" | "success";
};

export type WorkflowItem = {
  title: string;
  description: string;
  status?: string;
  href?: string;
};

export type WorkflowConfig = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  metrics: WorkflowMetric[];
  operatingRules: string[];
  queues: WorkflowItem[];
  linkedFlows: WorkflowItem[];
};

function renderMetricValue(value: string | number) {
  if (typeof value === "number") {
    return Math.abs(value) >= 1000 ? formatMoney(value) : value.toLocaleString("en-IN");
  }
  return value;
}

export function WorkflowPage({ config }: { config: WorkflowConfig }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={config.title}
        description={config.description}
        actionLabel={config.actionLabel}
        actionHref={config.actionHref}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{renderMetricValue(metric.value)}</p>
              {metric.helper ? <p className="mt-2 text-xs text-muted-foreground">{metric.helper}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Work Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.queues.map((item) => (
              <div key={item.title} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {item.status ? <Badge tone="info">{item.status}</Badge> : null}
                </div>
                {item.href ? (
                  <Button asChild variant="secondary" className="mt-3">
                    <Link href={item.href}>Open flow</Link>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounting Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.operatingRules.map((rule) => (
                <div key={rule} className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected Flows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.linkedFlows.map((item) => (
                <Link
                  key={item.title}
                  href={item.href ?? "#"}
                  className="block rounded-xl border p-3 transition hover:bg-muted"
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
