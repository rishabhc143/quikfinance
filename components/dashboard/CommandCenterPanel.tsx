"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CommandCenterData = {
  cards: { title: string; value: string; helper: string; href: string; status: string }[];
  alerts: { label: string; href: string; tone: "warning" | "success" | "info" }[];
  priorities: { title: string; description: string; href: string; tone: "warn" | "good" | "neutral" }[];
};

export function CommandCenterPanel({ data }: { data: CommandCenterData }) {
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
        {data.cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-soft">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle>
                <Badge tone="info">{card.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.helper}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alerts and Exceptions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {data.alerts.map((alert) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Priorities</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {data.priorities.map((priority) => (
            <Link key={priority.title} href={priority.href} className="rounded-2xl border p-4 transition hover:bg-muted">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge tone={priority.tone === "warn" ? "warning" : priority.tone === "good" ? "success" : "muted"}>{priority.tone}</Badge>
                  <p className="font-medium">{priority.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{priority.description}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

