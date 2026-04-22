import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ModuleConfig } from "@/lib/modules";

export function DetailPage({ config, id }: { config: ModuleConfig; id: string }) {
  const row = config.rows.find((item) => item.id === id) ?? config.rows[0];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={`${config.entityName[0]?.toUpperCase() ?? ""}${config.entityName.slice(1)} detail`} description={config.description} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={config.columns} rows={row ? [row] : []} title={`${config.title} detail`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={typeof row?.status === "string" ? row.status : "active"} />
            </div>
            <Button className="w-full">Edit</Button>
            <Button variant="secondary" className="w-full">
              Duplicate
            </Button>
            {config.key === "invoices" ? (
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/invoices/${id}/payment-link`}>Collect online</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary" className="w-full">
              <Link href={config.key === "bank-accounts" ? `/bank-accounts/${id}/reconciliation` : `/${config.key}`}>Open workflow</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
