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
  const primaryActions =
    data.role === "viewer"
      ? [
          { href: "/reports", label: "Open Reports", variant: "primary" as const },
          { href: "/collections", label: "Review Collections", variant: "secondary" as const },
          { href: "/exception-queue", label: "View Exceptions", variant: "secondary" as const }
        ]
      : [
          { href: "/invoices/new", label: t("dashboard.newInvoice", "New Invoice"), variant: "primary" as const },
          { href: "/payments/received", label: t("dashboard.recordPayment", "Record Payment"), variant: "secondary" as const },
          { href: "/expenses/new", label: t("dashboard.addExpense", "Add Expense"), variant: "secondary" as const },
          { href: "/bills/new", label: t("dashboard.newBill", "New Bill"), variant: "secondary" as const }
        ];

  const actionPrompts =
    data.role === "viewer"
      ? [
          { href: "/reports/profit-loss", title: "Review financials", description: "Open current P&L, balance sheet, and cash flow without changing data." },
          { href: "/audit-trail", title: "Review audit trail", description: "Trace recent changes across accounting and operations." },
          { href: "/exception-queue", title: "Check blockers", description: "See open exceptions that may need escalation." }
        ]
      : [
          { href: "/collections", title: "Review collections", description: "Follow up on overdue receivables and share payment links." },
          { href: "/payables", title: "Clear payables", description: "Review upcoming vendor dues and record payouts." },
          { href: "/reports/gst-summary", title: "Validate GST", description: "Check GST output, input credit, and parity issues before filing." }
        ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("dashboard.title", "Dashboard")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.description", "Revenue, cash, receivables, payables, and transaction activity.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {primaryActions.map((action) => (
            <Button key={action.href} asChild variant={action.variant}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
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
      <Card>
        <CardHeader>
          <CardTitle>Action Prompts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {actionPrompts.map((prompt) => (
            <Link key={prompt.href} href={prompt.href} className="rounded-lg border p-4 text-sm transition hover:bg-muted">
              <div className="font-medium">{prompt.title}</div>
              <div className="mt-1 text-muted-foreground">{prompt.description}</div>
            </Link>
          ))}
        </CardContent>
      </Card>
      <CommandCenterPanel data={data.commandCenter} />
      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueChart data={data.revenueExpense} />
        <ExpensesChart data={data.aging} />
        <CashFlowWidget data={data.cashFlow} />
        <AgingSummaryWidget feed={data.feed} />
      </div>
    </div>
  );
}
