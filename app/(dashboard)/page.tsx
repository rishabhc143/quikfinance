"use client";

import Link from "next/link";
import { AgingSummaryWidget } from "@/components/dashboard/AgingSummaryWidget";
import { CashFlowWidget } from "@/components/dashboard/CashFlowWidget";
import { CommandCenterPanel } from "@/components/dashboard/CommandCenterPanel";
import { ExpensesChart } from "@/components/dashboard/ExpensesChart";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useDashboard } from "@/lib/hooks/useDashboard";

export default function DashboardPage() {
  const { t } = useI18n();
  const { data } = useDashboard();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("dashboard.title", "Dashboard")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.description", "Revenue, cash, receivables, payables, and transaction activity.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/invoices/new">{t("dashboard.newInvoice", "New Invoice")}</Link></Button>
          <Button asChild variant="secondary"><Link href="/payments/received">{t("dashboard.recordPayment", "Record Payment")}</Link></Button>
          <Button asChild variant="secondary"><Link href="/expenses/new">{t("dashboard.addExpense", "Add Expense")}</Link></Button>
          <Button asChild variant="secondary"><Link href="/bills/new">{t("dashboard.newBill", "New Bill")}</Link></Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>
      {!data.setup.completed ? (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Complete company setup</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Setup progress is {data.setup.progress_percent}%. Finish onboarding to unlock the full accounting workflow.
              </p>
            </div>
            <Button asChild><Link href="/company-setup">Open setup</Link></Button>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {data.setup.checklist.map((item) => (
              <div key={item.key} className="rounded-md border bg-background px-3 py-2 text-sm">
                <span>{item.label}</span>
                <span className="ml-2 text-muted-foreground">{item.done ? "Done" : "Pending"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <CommandCenterPanel />
      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueChart data={data.revenueExpense} />
        <ExpensesChart data={data.aging} />
        <CashFlowWidget data={data.cashFlow} />
        <AgingSummaryWidget feed={data.feed} />
      </div>
    </div>
  );
}
