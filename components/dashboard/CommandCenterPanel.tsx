"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Landmark, Receipt, ShieldCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const commandCards = [
  {
    title: "GST Filing Readiness",
    value: "78%",
    helper: "Resolve GSTIN, place of supply, and ITC mismatches before filing.",
    href: "/gst-command-center",
    icon: Receipt,
    status: "3 alerts"
  },
  {
    title: "Bank Reconciliation",
    value: "7 suggestions",
    helper: "Review auto-match candidates and statement import exceptions.",
    href: "/bank-accounts",
    icon: Landmark,
    status: "Needs review"
  },
  {
    title: "Collections",
    value: "₹2.32L overdue",
    helper: "Prioritize reminders, payment links, and disputed receivables.",
    href: "/collections",
    icon: WalletCards,
    status: "AR priority"
  },
  {
    title: "Approvals",
    value: "6 pending",
    helper: "Maker-checker queue for bills, journals, and period overrides.",
    href: "/approvals",
    icon: ShieldCheck,
    status: "Control"
  }
];

const alerts = [
  { label: "One vendor bill may duplicate an OCR draft", href: "/documents", tone: "warning" as const },
  { label: "One stock item is below reorder point", href: "/warehouses", tone: "warning" as const },
  { label: "Trial balance is balanced for the active period", href: "/reports/trial-balance", tone: "success" as const }
];

export function CommandCenterPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Command Center</h2>
          <p className="text-sm text-muted-foreground">Daily controls for compliance, cash, collections, approvals, and exceptions.</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/exception-queue">Open exceptions</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commandCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-soft">
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
                  <Icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{card.helper}</p>
                  <Badge tone="info" className="mt-3">{card.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alerts and Exceptions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {alerts.map((alert) => (
            <Link key={alert.label} href={alert.href} className="rounded-2xl border p-4 transition hover:bg-muted">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <Badge tone={alert.tone}>{alert.tone}</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
