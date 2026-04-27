"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompanySettings = {
  invoice_prefix?: string;
  preferred_language?: string;
  base_currency?: string;
};

const templateCards = [
  { key: "classic", title: "Classic Invoice", description: "Standard line-item invoice layout for most client billing." },
  { key: "modern", title: "Modern Invoice", description: "Cleaner external-facing format for design- or SaaS-heavy businesses." },
  { key: "minimal", title: "Minimal Invoice", description: "Compact print-friendly layout for simple billing and exports." }
];

export function TemplatesWorkspace() {
  const company = useQuery({
    queryKey: ["template-company-settings"],
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/company");
      const payload = (await response.json()) as { data?: CompanySettings };
      if (!response.ok) {
        return {};
      }
      return payload.data ?? {};
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Invoice prefix</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{company.data?.invoice_prefix ?? "INV"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Language</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{(company.data?.preferred_language ?? "en").toUpperCase()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Base currency</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{company.data?.base_currency ?? "INR"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Template modes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{templateCards.length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Document Template Set</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {templateCards.map((template) => (
            <div key={template.key} className="rounded-2xl border p-4">
              <p className="font-semibold">{template.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="secondary"><Link href="/invoices/new">Use on invoice</Link></Button>
                <Button asChild variant="secondary"><Link href="/quotations/new">Use on quotation</Link></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Template Controls</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href="/settings/company">Company branding</Link></Button>
          <Button asChild variant="secondary"><Link href="/invoices/new">Preview invoice</Link></Button>
          <Button asChild variant="secondary"><Link href="/help/demo-guide">Demo guide</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
