"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TemplateSettings = {
  invoice_prefix: string;
  preferred_language: "en" | "hi";
  base_currency: string;
  default_invoice_template: "classic" | "modern" | "minimal";
  default_quotation_template: "classic" | "modern" | "minimal";
  invoice_note_template: string;
  quotation_note_template: string;
};

const templateCards = [
  { key: "classic", title: "Classic", description: "Standard line-item layout for most invoice and quotation flows." },
  { key: "modern", title: "Modern", description: "Cleaner outward format for SaaS, design, and services businesses." },
  { key: "minimal", title: "Minimal", description: "Compact print-first layout with low visual noise." }
] as const;

const defaultSettings: TemplateSettings = {
  invoice_prefix: "INV",
  preferred_language: "en",
  base_currency: "INR",
  default_invoice_template: "classic",
  default_quotation_template: "classic",
  invoice_note_template: "",
  quotation_note_template: ""
};

async function readSettings() {
  const response = await fetch("/api/v1/templates/settings", { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { data?: TemplateSettings; error?: { message?: string } };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Template settings could not be loaded.");
  }
  return payload.data;
}

export function TemplatesWorkspace() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);

  const templateQuery = useQuery({
    queryKey: ["template-settings"],
    queryFn: readSettings
  });

  useEffect(() => {
    if (templateQuery.data) {
      setSettings(templateQuery.data);
    }
  }, [templateQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/templates/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = (await response.json().catch(() => ({}))) as { data?: TemplateSettings; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Template settings could not be saved.");
      }
      return payload.data;
    },
    onSuccess: async (data) => {
      setSettings(data);
      toast.success("Template settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["template-settings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Template settings could not be saved.")
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Invoice prefix</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{settings.invoice_prefix}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Language</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{settings.preferred_language.toUpperCase()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Base currency</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{settings.base_currency}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Invoice template</CardTitle></CardHeader><CardContent className="text-2xl font-bold capitalize">{settings.default_invoice_template}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Template defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="invoice-prefix">Invoice prefix</Label>
              <Input id="invoice-prefix" value={settings.invoice_prefix} onChange={(event) => setSettings((current) => ({ ...current, invoice_prefix: event.target.value }))} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="base-currency">Base currency</Label>
              <Input id="base-currency" value={settings.base_currency} onChange={(event) => setSettings((current) => ({ ...current, base_currency: event.target.value.toUpperCase() }))} className="mt-2" maxLength={3} />
            </div>
            <div>
              <Label htmlFor="template-language">Preferred language</Label>
              <select id="template-language" value={settings.preferred_language} onChange={(event) => setSettings((current) => ({ ...current, preferred_language: event.target.value as "en" | "hi" }))} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            <div>
              <Label htmlFor="invoice-template">Default invoice template</Label>
              <select id="invoice-template" value={settings.default_invoice_template} onChange={(event) => setSettings((current) => ({ ...current, default_invoice_template: event.target.value as TemplateSettings["default_invoice_template"] }))} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {templateCards.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="quotation-template">Default quotation template</Label>
              <select id="quotation-template" value={settings.default_quotation_template} onChange={(event) => setSettings((current) => ({ ...current, default_quotation_template: event.target.value as TemplateSettings["default_quotation_template"] }))} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {templateCards.map((template) => <option key={template.key} value={template.key}>{template.title}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invoice-note-template">Invoice notes / terms</Label>
              <Textarea
                id="invoice-note-template"
                rows={4}
                value={settings.invoice_note_template}
                onChange={(event) => setSettings((current) => ({ ...current, invoice_note_template: event.target.value }))}
                placeholder="Payment due within 30 days. GST invoice generated electronically."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="quotation-note-template">Quotation notes</Label>
              <Textarea
                id="quotation-note-template"
                rows={4}
                value={settings.quotation_note_template}
                onChange={(event) => setSettings((current) => ({ ...current, quotation_note_template: event.target.value }))}
                placeholder="Commercial validity: 15 days. Taxes extra if applicable."
                className="mt-2"
              />
            </div>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Saving..." : "Save template settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Document templates</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {templateCards.map((template) => (
            <div key={template.key} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{template.title}</p>
                {settings.default_invoice_template === template.key ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">invoice default</span> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setSettings((current) => ({ ...current, default_invoice_template: template.key }))}>Use for invoices</Button>
                <Button type="button" variant="secondary" onClick={() => setSettings((current) => ({ ...current, default_quotation_template: template.key }))}>Use for quotations</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Template controls</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href="/settings/company">Company branding</Link></Button>
          <Button asChild variant="secondary"><Link href="/invoices/new">Preview invoice</Link></Button>
          <Button asChild variant="secondary"><Link href="/quotations/new">Preview quotation</Link></Button>
          <Button asChild variant="secondary"><Link href="/help/demo-guide">Demo guide</Link></Button>
        </CardContent>
      </Card>

      {templateQuery.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading template settings...</div> : null}
      {templateQuery.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(templateQuery.error as Error).message}</div> : null}
    </div>
  );
}
