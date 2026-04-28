"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/utils/dates";

type InvoiceOption = { id: string; invoice_number?: string };

export function EInvoicingEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [submissionNumber, setSubmissionNumber] = useState("");
  const [submissionDate, setSubmissionDate] = useState(todayISO());
  const [taxableValue, setTaxableValue] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [status, setStatus] = useState("draft");
  const [irn, setIrn] = useState("");
  const [ackNumber, setAckNumber] = useState("");
  const [ackDate, setAckDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [invoiceRes, detailRes] = await Promise.all([
          fetch("/api/v1/invoices", { signal: controller.signal }),
          editId ? fetch(`/api/v1/e-invoicing/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const invoiceJson = await invoiceRes.json().catch(() => ({ data: [] }));
        setInvoices(Array.isArray(invoiceJson.data) ? invoiceJson.data : []);
        if (detailRes) {
          const detailJson = await detailRes.json().catch(() => ({}));
          if (!detailRes.ok) throw new Error(detailJson.error?.message ?? "E-invoice submission could not be loaded.");
          const record = detailJson.data ?? {};
          setInvoiceId(String(record.invoice_id ?? ""));
          setInvoiceNumber(String(record.invoice_number ?? ""));
          setSubmissionNumber(String(record.submission_number ?? ""));
          setSubmissionDate(String(record.submission_date ?? todayISO()));
          setTaxableValue(Number(record.taxable_value ?? 0));
          setTotalTax(Number(record.total_tax ?? 0));
          setStatus(String(record.status ?? "draft"));
          setIrn(String(record.irn ?? ""));
          setAckNumber(String(record.ack_number ?? ""));
          setAckDate(String(record.ack_date ?? ""));
          setErrorMessage(String(record.error_message ?? ""));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "E-invoice submission could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const submit = async () => {
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/e-invoicing/${editId}` : "/api/v1/e-invoicing", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId || null,
          invoice_number: invoiceNumber,
          submission_number: submissionNumber || undefined,
          submission_date: submissionDate,
          taxable_value: taxableValue,
          total_tax: totalTax,
          status,
          irn: irn || null,
          ack_number: ackNumber || null,
          ack_date: ackDate || null,
          error_message: errorMessage || null
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "E-invoice submission could not be saved.");
      toast.success("E-invoice submission saved.");
      router.push(json.data?.id ? `/e-invoicing/${json.data.id}` : "/e-invoicing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-invoice submission could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading e-invoice editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editId ? "Edit e-invoice submission" : "New e-invoice submission"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Invoice</Label>
            <select value={invoiceId} onChange={(event) => { setInvoiceId(event.target.value); const invoice = invoices.find((entry) => entry.id === event.target.value); if (invoice?.invoice_number) setInvoiceNumber(invoice.invoice_number); }} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional invoice link</option>
              {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number ?? invoice.id}</option>)}
            </select>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href="/invoices" className="text-primary underline underline-offset-2">Open invoices</Link>
              {invoiceId ? <Link href={`/invoices/${invoiceId}`} className="text-muted-foreground underline underline-offset-2">Open invoice</Link> : null}
            </div>
          </div>
          <div>
            <Label>Invoice number</Label>
            <Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Submission number</Label>
            <Input value={submissionNumber} onChange={(event) => setSubmissionNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Submission date</Label>
            <Input type="date" value={submissionDate} onChange={(event) => setSubmissionDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Taxable value</Label>
            <Input type="number" step="0.01" value={taxableValue} onChange={(event) => setTaxableValue(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Total tax</Label>
            <Input type="number" step="0.01" value={totalTax} onChange={(event) => setTotalTax(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["draft", "queued", "submitted", "generated", "failed", "cancelled"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>IRN</Label>
            <Input value={irn} onChange={(event) => setIrn(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Acknowledgement number</Label>
            <Input value={ackNumber} onChange={(event) => setAckNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Acknowledgement date</Label>
            <Input type="date" value={ackDate} onChange={(event) => setAckDate(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Error message</Label>
            <Textarea value={errorMessage} onChange={(event) => setErrorMessage(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/e-invoicing")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save submission"}</Button>
      </div>
    </div>
  );
}
