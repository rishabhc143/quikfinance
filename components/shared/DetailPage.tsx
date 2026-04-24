"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { translateModuleMeta, useI18n } from "@/lib/i18n";
import type { ModuleConfig } from "@/lib/modules";

export function DetailPage({ config, id }: { config: ModuleConfig; id: string }) {
  const { locale, t } = useI18n();
  const meta = translateModuleMeta(locale, config.key, {
    title: config.title,
    description: config.description,
    entityName: config.entityName,
    primaryAction: config.primaryAction
  });
  const row = config.rows.find((item) => item.id === id) ?? config.rows[0];
  const itemPath = config.apiPath.split("?")[0];
  const detail = useQuery({
    queryKey: ["detail", config.key, id],
    queryFn: async () => {
      const response = await fetch(`${itemPath}/${id}`);
      if (!response.ok) {
        return row;
      }
      const payload = (await response.json()) as { data?: typeof row };
      return payload.data ?? row;
    },
    initialData: row
  });
  const activeRow = detail.data ?? row;
  const editHref = config.newPath ? `${config.newPath}?edit=${id}` : `/${config.key}`;
  const duplicateHref = config.newPath ? `${config.newPath}?duplicate=${id}` : `/${config.key}`;
  const listHref = config.listPath ?? `/${config.key}`;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={`${meta.entityName[0]?.toUpperCase() ?? ""}${meta.entityName.slice(1)} detail`} description={meta.description} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("common.activity", "Activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={config.columns} rows={activeRow ? [activeRow] : []} title={`${meta.title} detail`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("common.controls", "Controls")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("common.status", "Status")}</span>
              <StatusBadge status={typeof activeRow?.status === "string" ? activeRow.status : "active"} />
            </div>
            <Button asChild className="w-full">
              <Link href={editHref}>{config.newPath ? t("common.edit", "Edit") : "Manage"}</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href={duplicateHref}>{config.newPath ? t("common.duplicate", "Duplicate") : "Back to list"}</Link>
            </Button>
            {config.key === "invoices" ? (
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/invoices/${id}/payment-link`}>{t("common.collectOnline", "Collect online")}</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary" className="w-full">
              <Link href={config.key === "bank-accounts" ? `/bank-accounts/${id}/reconciliation` : listHref}>{t("common.openWorkflow", "Open workflow")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
