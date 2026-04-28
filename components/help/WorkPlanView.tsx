"use client";

import Link from "next/link";
import { workPlanDeliverables, workPlanHighlights, workPlanSections, workPlanSuccessCriteria } from "@/lib/work-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkPlanView({ printable = false }: { printable?: boolean }) {
  return (
    <div className={printable ? "mx-auto max-w-5xl space-y-8 bg-white px-8 py-10 text-black print:px-0 print:py-0" : "space-y-8"}>
      {!printable ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/help/work-plan/print">Open Printable Version</Link>
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print This Page
          </Button>
        </div>
      ) : null}

      <Card className={printable ? "border-black/10 shadow-none" : undefined}>
        <CardHeader>
          <CardTitle>2-Week Objective</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Move QuikFinance from a strong operational MVP into a cleaner client-demo-ready and pilot-ready finance product.</p>
          <div>
            <div className="mb-2 font-semibold">Primary Goals</div>
            <ul className="list-disc space-y-2 pl-5">
              {workPlanHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {workPlanSections.map((section, index) => (
          <Card key={section.title} className={printable ? "border-black/10 shadow-none" : undefined}>
            <CardHeader>
              <CardTitle className="text-lg">
                {index + 1}. {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{section.summary}</p>
              <ul className="list-disc space-y-2 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={printable ? "border-black/10 shadow-none" : undefined}>
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {workPlanDeliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className={printable ? "border-black/10 shadow-none" : undefined}>
        <CardHeader>
          <CardTitle>Success Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {workPlanSuccessCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
