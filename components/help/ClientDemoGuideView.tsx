"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientDemoGuide, demoGuideVariants, recommendedDemoOrder } from "@/lib/client-demo-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DemoVariant = (typeof demoGuideVariants)[number]["key"];
type ReadinessPayload = {
  readiness_score: number;
  readiness_total: number;
  checks: Array<{ key: string; label: string; done: boolean; route: string }>;
};

const STORAGE_KEY = "quikfinance:demo-guide:progress";

function loadProgress() {
  if (typeof window === "undefined") return {} as Record<string, boolean>;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function ClientDemoGuideView({ printable = false }: { printable?: boolean }) {
  const [variant, setVariant] = useState<DemoVariant>("founder");
  const [mode, setMode] = useState<"steps" | "talking">("steps");
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const readiness = useQuery({
    queryKey: ["demo-guide-readiness"],
    queryFn: async () => {
      const response = await fetch("/api/v1/demo-guide/readiness", { cache: "no-store" });
      const payload = (await response.json()) as { data?: ReadinessPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Demo readiness could not be loaded.");
      }
      return payload.data;
    },
    enabled: !printable
  });

  useEffect(() => {
    if (!printable) {
      setProgress(loadProgress());
    }
  }, [printable]);

  const visibleSections = useMemo(
    () => clientDemoGuide.filter((section) => !section.audience || section.audience.includes(variant)),
    [variant]
  );
  const completedCount = useMemo(() => visibleSections.filter((section) => progress[section.title]).length, [progress, visibleSections]);
  const duration = useMemo(() => visibleSections.reduce((sum, section) => sum + Number(section.minutes ?? 0), 0), [visibleSections]);

  const toggleStep = (title: string) => {
    const next = { ...progress, [title]: !progress[title] };
    setProgress(next);
    saveProgress(next);
  };

  return (
    <div className={printable ? "mx-auto max-w-5xl space-y-8 bg-white px-8 py-10 text-black print:px-0 print:py-0" : "space-y-8"}>
      {!printable ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/help/demo-guide/print">Open Printable Version</Link>
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print This Page
          </Button>
        </div>
      ) : null}

      {!printable ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Demo controls</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Choose the demo audience, switch between click-path and talk-track modes, and track progress as you go.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={variant} onChange={(event) => setVariant(event.target.value as DemoVariant)} className="h-10 rounded-md border bg-background px-3 text-sm">
                {demoGuideVariants.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <select value={mode} onChange={(event) => setMode(event.target.value as "steps" | "talking")} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="steps">Click Path</option>
                <option value="talking">Talk Track</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <div className="text-sm text-muted-foreground">Visible sections</div>
              <div className="mt-2 text-2xl font-bold">{visibleSections.length}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm text-muted-foreground">Completed in this browser</div>
              <div className="mt-2 text-2xl font-bold">{completedCount}</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="text-sm text-muted-foreground">Estimated duration</div>
              <div className="mt-2 text-2xl font-bold">{duration} min</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!printable ? (
        <Card>
          <CardHeader>
            <CardTitle>Pre-Demo Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readiness.isLoading ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Checking demo readiness...</div> : null}
            {readiness.isError ? <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{(readiness.error as Error).message}</div> : null}
            {readiness.data ? (
              <>
                <div className="text-sm text-muted-foreground">{readiness.data.readiness_score} of {readiness.data.readiness_total} readiness checks are complete.</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {readiness.data.checks.map((check) => (
                    <Link key={check.key} href={check.route} className="rounded-xl border p-4 transition hover:bg-muted">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{check.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{check.done ? "Ready" : "Needs setup"}</div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${check.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {check.done ? "Ready" : "Pending"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className={printable ? "border-black/10 shadow-none" : undefined}>
        <CardHeader>
          <CardTitle>Recommended Demo Order</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {recommendedDemoOrder.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {visibleSections.map((section, index) => (
          <Card key={section.title} className={printable ? "border-black/10 shadow-none" : undefined}>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {index + 1}. {section.title}
                  </CardTitle>
                  {section.route ? (
                    <div className="text-sm text-muted-foreground">
                      Route:{" "}
                      {printable ? (
                        <span className="font-mono text-black">{section.route}</span>
                      ) : (
                        <Link href={section.route} className="font-mono underline">
                          {section.route}
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>
                {!printable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold text-muted-foreground">{section.minutes ?? 0} min</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(progress[section.title])} onChange={() => toggleStep(section.title)} />
                      Done
                    </label>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "steps" || printable ? (
                <div>
                  <div className="mb-2 text-sm font-semibold">Steps</div>
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(mode === "talking" || printable) && section.talkingPoints?.length ? (
                <div>
                  <div className="mb-2 text-sm font-semibold">How To Explain It</div>
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {section.talkingPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!printable && section.route ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={section.route}>Open step</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard">Back to dashboard</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

