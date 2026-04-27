"use client";

import Link from "next/link";
import { clientDemoGuide, recommendedDemoOrder } from "@/lib/client-demo-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientDemoGuideView({ printable = false }: { printable?: boolean }) {
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
        {clientDemoGuide.map((section, index) => (
          <Card key={section.title} className={printable ? "border-black/10 shadow-none" : undefined}>
            <CardHeader>
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-semibold">Steps</div>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              {section.talkingPoints?.length ? (
                <div>
                  <div className="mb-2 text-sm font-semibold">How To Explain It</div>
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {section.talkingPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
