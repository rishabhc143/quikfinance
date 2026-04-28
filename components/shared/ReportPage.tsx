"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { translateReportMeta, useI18n } from "@/lib/i18n";
import { getReportCatalogEntry } from "@/lib/report-catalog";
import type { ReportConfig } from "@/lib/reports";
import { formatMoney } from "@/lib/utils/currency";

export function ReportPage({ config }: { config: ReportConfig }) {
  const { locale } = useI18n();
  const meta = translateReportMeta(locale, config.key, { title: config.title, description: config.description });
  const [range, setRange] = useState({ from: "2026-01-01", to: "2026-04-20" });
  const reportMeta = getReportCatalogEntry(config.key);
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
      <PageHeader title={meta.title} description={meta.description} />
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        <div className="flex gap-2">
          <ReportExportButton label="PDF" mode="pdf" report={data} range={range} />
          <ReportExportButton label="CSV" mode="csv" report={data} range={range} />
        </div>
      </div>
      {reportMeta ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Audience</CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium">{reportMeta.audience}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Review cadence</CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium">{reportMeta.cadence}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Related actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {reportMeta.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
                >
                  {action.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {data.summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className={item.tone === "good" ? "text-2xl font-bold text-emerald-600" : item.tone === "warn" ? "text-2xl font-bold text-amber-600" : "text-2xl font-bold"}>
              {item.kind === "number" ? new Intl.NumberFormat("en-IN").format(item.value) : item.kind === "percent" ? `${item.value}%` : formatMoney(item.value)}
            </CardContent>
          </Card>
        ))}
      </div>
      {data.sections?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {data.sections.map((section) => (
              <div key={section.key} className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium">{section.label}</div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>Taxable: {formatMoney(section.taxable_value)}</div>
                  <div>Tax: {formatMoney(section.tax_amount)}</div>
                  <div>Docs: {new Intl.NumberFormat("en-IN").format(section.documents)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {data.totals ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Computed totals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(data.totals).map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{key.replaceAll("_", " ")}</div>
                <div className="mt-2 text-lg font-semibold">{formatMoney(value)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <DataTable columns={data.columns} rows={data.rows} title={meta.title} />
    </div>
  );
}
