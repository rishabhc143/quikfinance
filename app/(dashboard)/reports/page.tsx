"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { translateReportMeta, useI18n } from "@/lib/i18n";
import { reportConfigs } from "@/lib/reports";

export default function ReportsPage() {
  const { locale, t } = useI18n();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={t("reports.title", "Reports")} description={t("reports.description", "Financial statements, aging, ledger movement, customer sales, expense categories, and exports.")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(reportConfigs).map((report) => {
          const meta = translateReportMeta(locale, report.key, { title: report.title, description: report.description });
          return (
          <Link key={report.key} href={`/reports/${report.key}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-soft">
              <CardHeader>
                <CardTitle>{meta.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{meta.description}</CardContent>
            </Card>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
