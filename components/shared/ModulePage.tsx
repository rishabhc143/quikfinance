"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { translateModuleMeta, useI18n } from "@/lib/i18n";
import type { ModuleConfig, TableRow, TableValue } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

function isTableValue(value: unknown): value is TableValue {
  return ["string", "number", "boolean"].includes(typeof value) || value === null;
}

function normalizeRows(value: unknown, fallback: TableRow[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const rows = value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item, index) => {
      const row: TableRow = { id: typeof item.id === "string" ? item.id : `row-${index}` };
      Object.entries(item).forEach(([key, entry]) => {
        if (isTableValue(entry)) {
          row[key] = entry;
        }
      });
      return row;
    });
  return rows.length > 0 ? rows : fallback;
}

export function ModulePage({ config }: { config: ModuleConfig }) {
  const { locale, t } = useI18n();
  const meta = translateModuleMeta(locale, config.key, {
    title: config.title,
    description: config.description,
    entityName: config.entityName,
    primaryAction: config.primaryAction
  });
  const { data: rows } = useQuery({
    queryKey: ["module", config.key],
    queryFn: async () => {
      const response = await fetch(config.apiPath);
      if (!response.ok) {
        return config.rows;
      }
      const payload = (await response.json()) as { data?: unknown };
      return normalizeRows(payload.data, config.rows);
    },
    initialData: config.rows
  });

  const total = rows.reduce((sum, row) => {
    const amount = row.total ?? row.amount ?? row.rate ?? row.balance ?? row.current_balance ?? row.outstanding ?? 0;
    return sum + (typeof amount === "number" ? amount : 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={meta.title} description={meta.description} actionLabel={meta.primaryAction} actionHref={config.newPath} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("common.records", "Records")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("common.trackedValue", "Tracked value")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatMoney(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("common.workflow", "Workflow")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="secondary">{t("common.importCsv", "Import CSV")}</Button>
            <Button variant="secondary">{t("common.exportPdf", "Export PDF")}</Button>
          </CardContent>
        </Card>
      </div>
      {rows.length > 0 ? (
        <DataTable columns={config.columns} rows={rows} title={meta.title} />
      ) : (
        <EmptyState
          title={`No ${meta.title.toLowerCase()} yet`}
          description={`Create your first ${meta.entityName} or import existing records from CSV.`}
          actionLabel={meta.primaryAction}
          actionHref={config.newPath}
        />
      )}
    </div>
  );
}
