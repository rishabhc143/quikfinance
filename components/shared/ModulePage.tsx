"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
      <PageHeader title={config.title} description={config.description} actionLabel={config.primaryAction} actionHref={config.newPath} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tracked value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatMoney(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="secondary">Import CSV</Button>
            <Button variant="secondary">Export PDF</Button>
          </CardContent>
        </Card>
      </div>
      {rows.length > 0 ? (
        <DataTable columns={config.columns} rows={rows} title={config.title} />
      ) : (
        <EmptyState
          title={`No ${config.title.toLowerCase()} yet`}
          description={`Create your first ${config.entityName} or import existing records from CSV.`}
          actionLabel={config.primaryAction}
          actionHref={config.newPath}
        />
      )}
    </div>
  );
}
