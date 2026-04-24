"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";

type LineItem = { description: string; quantity: number; rate: number; gst_rate: number; discount: number };

function emptyLine(): LineItem {
  return { description: "", quantity: 1, rate: 0, gst_rate: 18, discount: 0 };
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

export function OcrDraftBuilder() {
  const router = useRouter();
  const [parsedId, setParsedId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [notes, setNotes] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [parsed, setParsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const previewSubtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate - line.discount, 0);
    const previewTax = lines.reduce((sum, line) => sum + ((line.quantity * line.rate - line.discount) * line.gst_rate) / 100, 0);
    return { subtotal: toMoney(previewSubtotal), tax: toMoney(previewTax), total: toMoney(previewSubtotal + previewTax) };
  }, [lines]);

  const parseOcr = async () => {
    if (!sourceName || !sourceText) {
      toast.error("Add source name and OCR text first.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/ocr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: "bill", source_name: sourceName, source_text: sourceText, notes })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "OCR parse failed.");
      const extracted = json.data?.extracted_fields ?? json.data ?? {};
      setParsedId(typeof json.data?.id === "string" ? json.data.id : null);
      setVendorName(String(extracted.vendor_name ?? ""));
      setBillNumber(String(extracted.invoice_number ?? extracted.bill_number ?? ""));
      setIssueDate(String(extracted.issue_date ?? ""));
      setDueDate(String(extracted.due_date ?? ""));
      setSubtotal(Number(extracted.subtotal ?? 0));
      setTaxTotal(Number(extracted.tax_total ?? 0));
      setTotal(Number(extracted.total ?? 0));
      setParsed(true);
      toast.success("OCR draft parsed. Review and save.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OCR parse failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveReviewedDraft = async () => {
    if (!sourceName || !sourceText || !vendorName) {
      toast.error("Source and vendor details are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        document_type: "bill",
        source_name: sourceName,
        source_text: sourceText,
        notes,
        extracted_fields_override: {
          vendor_name: vendorName,
          invoice_number: billNumber,
          bill_number: billNumber,
          issue_date: issueDate || null,
          due_date: dueDate || issueDate || null,
          subtotal: subtotal || totals.subtotal,
          tax_total: taxTotal || totals.tax,
          total: total || totals.total,
          line_items: lines.filter((line) => line.description.trim()).map((line) => ({
            description: line.description,
            quantity: line.quantity,
            rate: line.rate,
            gst_rate: line.gst_rate,
            discount: line.discount
          }))
        }
      };
      const response = await fetch(parsedId ? `/api/v1/ocr/documents/${parsedId}` : "/api/v1/ocr/documents", {
        method: parsedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "OCR draft could not be saved.");
      toast.success("OCR draft saved.");
      router.push("/ocr-bills");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OCR draft could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OCR source</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Source name</Label>
            <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>OCR text</Label>
            <Textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="mt-2 min-h-[220px]" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="button" variant="secondary" onClick={parseOcr} disabled={saving}>{saving ? "Parsing..." : "Parse OCR text"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewed fields</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Vendor name</Label>
            <Input value={vendorName} onChange={(event) => setVendorName(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Bill number</Label>
            <Input value={billNumber} onChange={(event) => setBillNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Subtotal</Label>
            <Input type="number" step="0.01" value={subtotal} onChange={(event) => setSubtotal(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Tax total</Label>
            <Input type="number" step="0.01" value={taxTotal} onChange={(event) => setTaxTotal(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Total</Label>
            <Input type="number" step="0.01" value={total} onChange={(event) => setTotal(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div className="flex items-end text-sm text-muted-foreground">{parsed ? "Parsed OCR values loaded. You can override them before saving." : "Optional: parse OCR first, or enter reviewed values manually."}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reviewed line items</CardTitle>
          <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, emptyLine()])}>Add line</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={line.description} onChange={(event) => setLines((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, description: event.target.value } : entry))} className="mt-2" />
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" step="0.01" value={line.quantity} onChange={(event) => setLines((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, quantity: Number(event.target.value || 0) } : entry))} className="mt-2" />
              </div>
              <div>
                <Label>Rate</Label>
                <Input type="number" step="0.01" value={line.rate} onChange={(event) => setLines((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, rate: Number(event.target.value || 0) } : entry))} className="mt-2" />
              </div>
              <div>
                <Label>GST %</Label>
                <Input type="number" step="0.01" value={line.gst_rate} onChange={(event) => setLines((current) => current.map((entry, rowIndex) => rowIndex === index ? { ...entry, gst_rate: Number(event.target.value || 0) } : entry))} className="mt-2" />
              </div>
            </div>
          ))}
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div className="flex justify-between rounded-lg border p-3"><span>Preview subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
            <div className="flex justify-between rounded-lg border p-3"><span>Preview tax</span><span>{formatMoney(totals.tax)}</span></div>
            <div className="flex justify-between rounded-lg border p-3 font-semibold"><span>Preview total</span><span>{formatMoney(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/ocr-bills")}>Cancel</Button>
        <Button type="button" onClick={saveReviewedDraft} disabled={saving}>{saving ? "Saving..." : "Save reviewed OCR draft"}</Button>
      </div>
    </div>
  );
}
