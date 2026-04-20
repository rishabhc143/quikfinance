"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import type { ReportConfig } from "@/lib/reports";
import { formatMoney } from "@/lib/utils/currency";

export function ReportPage({ config }: { config: ReportConfig }) {
  const [range, setRange] = useState({ from: "2026-01-01", to: "2026-04-20" });
  const { data } = useQuery({
    queryKey: ["report", config.key, range],
    queryFn: async () => {
      const params = new URLSearchParams(range);
      const response = await fetch(`${config.apiPath}?${params.toString()}`);
      if (!response.ok) {
        return config;
      }
      const payload = (await response.json()) as { data?: ReportConfig };
      return payload.data ?? config;
    },
    initialData: config
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={config.title} description={config.description} />
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        <div className="flex gap-2">
          <ReportExportButton label="PDF" />
          <ReportExportButton label="CSV" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className={item.tone === "good" ? "text-2xl font-bold text-emerald-600" : item.tone === "warn" ? "text-2xl font-bold text-amber-600" : "text-2xl font-bold"}>
              {item.label.toLowerCase().includes("margin") || item.label.toLowerCase().includes("risk") ? `${item.value}%` : formatMoney(item.value)}
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable columns={data.columns} rows={data.rows} title={data.title} />
    </div>
  );
}
