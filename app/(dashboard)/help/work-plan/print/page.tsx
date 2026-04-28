"use client";

import Link from "next/link";
import { WorkPlanView } from "@/components/help/WorkPlanView";
import { Button } from "@/components/ui/button";

export default function WorkPlanPrintPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">QuikFinance 2-Week Work Plan</h1>
          <p className="mt-1 text-sm text-slate-600">Printable version for meetings, planning, and PDF export.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link href="/help/work-plan">Back To App View</Link>
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>
      <WorkPlanView printable />
    </main>
  );
}
