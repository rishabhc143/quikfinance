"use client";

import Link from "next/link";
import { ClientDemoGuideView } from "@/components/help/ClientDemoGuideView";
import { Button } from "@/components/ui/button";

export default function DemoGuidePrintPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">QuikFinance Client Demo Guide</h1>
          <p className="mt-1 text-sm text-slate-600">Printable version for meetings, handoffs, and PDF export.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link href="/help/demo-guide">Back To App View</Link>
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>
      <ClientDemoGuideView printable />
    </main>
  );
}
