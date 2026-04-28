"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Landmark, ReceiptText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { translateReportMeta, useI18n } from "@/lib/i18n";
import { reportCatalog, reportGroups } from "@/lib/report-catalog";
import { reportConfigs } from "@/lib/reports";

const groupIcons = {
  "Financial Statements": Landmark,
  "Working Capital": BarChart3,
  "GST & Compliance": ReceiptText
} as const;

export default function ReportsPage() {
  const { locale, t } = useI18n();

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={t("reports.title", "Reports")}
        description={t(
          "reports.description",
          "Operational finance reports grouped for monthly close, working-capital review, and GST/compliance checks."
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Financial pack</CardDescription>
            <CardTitle>4 core statements</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Profit & Loss, Balance Sheet, Trial Balance, and Cash Flow for founder and accountant review.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Working capital</CardDescription>
            <CardTitle>Collections and payables</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Aging and outstanding reports for daily follow-up on invoice recovery and supplier payments.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Compliance pack</CardDescription>
            <CardTitle>GST review set</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            GST Summary, GST parity, GSTR-1, and GSTR-3B for tax review and filing preparation.
          </CardContent>
        </Card>
      </div>

      {reportGroups.map((group) => {
        const Icon = groupIcons[group];
        const entries = reportCatalog.filter((entry) => entry.group === group);

        return (
          <section key={group} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full border bg-background p-2">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{group}</h2>
                <p className="text-sm text-muted-foreground">
                  {group === "Financial Statements"
                    ? "Core statements for close, management review, and audit readiness."
                    : group === "Working Capital"
                      ? "Receivable and payable visibility for daily operations."
                      : "Tax diagnostics and filing-preparation reports."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => {
                const report = reportConfigs[entry.key];
                const meta = translateReportMeta(locale, report.key, {
                  title: report.title,
                  description: report.description
                });

                return (
                  <Card key={entry.key} className="flex h-full flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-soft">
                    <CardHeader className="space-y-3">
                      <div className="space-y-1">
                        <CardTitle>{meta.title}</CardTitle>
                        <CardDescription>{meta.description}</CardDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="rounded-md bg-muted/60 p-2">
                          <div className="font-medium text-foreground">Audience</div>
                          <div>{entry.audience}</div>
                        </div>
                        <div className="rounded-md bg-muted/60 p-2">
                          <div className="font-medium text-foreground">Cadence</div>
                          <div>{entry.cadence}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {entry.actions.map((action) => (
                          <Link
                            key={action.href}
                            href={action.href}
                            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground"
                          >
                            {action.label}
                          </Link>
                        ))}
                      </div>
                      <Link
                        href={`/reports/${entry.key}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:gap-3"
                      >
                        Open report
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
