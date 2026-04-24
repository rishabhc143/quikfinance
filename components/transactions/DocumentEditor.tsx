"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type ContactOption = { id: string; display_name: string; state_code?: string | null };
type ItemOption = { id: string; name: string; sales_price?: number; purchase_price?: number; gst_rate?: number | null };
type TaxOption = { id: string; name: string; rate: number };

type LineItem = {
  item_id: string | null;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  tax_rate_id: string | null;
  gst_rate: number;
};

function emptyLine(): LineItem {
  return { item_id: null, description: "", quantity: 1, rate: 0, discount: 0, tax_rate_id: null, gst_rate: 0 };
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

export function DocumentEditor({ kind }: { kind: "invoice" | "bill" }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const loadId = editId ?? duplicateId;
  const isInvoice = kind === "invoice";
  const apiBase = isInvoice ? "/api/v1/invoices" : "/api/v1/bills";
  const contactsApi = isInvoice ? "/api/v1/customers" : "/api/v1/vendors";
  const listPath = isInvoice ? "/invoices" : "/bills";

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [taxes, setTaxes] = useState<TaxOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contactId, setContactId] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [status, setStatus] = useState("draft");
  const [currency, setCurrency] = useState("INR");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [roundOff, setRoundOff] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
    setDuplicateId(search.get("duplicate"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const boot = async () => {
      setLoading(true);
      try {
        const [contactRes, itemRes, taxRes] = await Promise.all([
          fetch(contactsApi, { signal: controller.signal }),
          fetch("/api/v1/inventory", { signal: controller.signal }),
          fetch("/api/v1/taxes", { signal: controller.signal })
        ]);

        const [contactJson, itemJson, taxJson] = await Promise.all([
          contactRes.json().catch(() => ({ data: [] })),
          itemRes.json().catch(() => ({ data: [] })),
          taxRes.json().catch(() => ({ data: [] }))
        ]);

        setContacts(Array.isArray(contactJson.data) ? contactJson.data : []);
        setItems(Array.isArray(itemJson.data) ? itemJson.data : []);
        setTaxes(Array.isArray(taxJson.data) ? taxJson.data : []);

        if (loadId) {
          const response = await fetch(`${apiBase}/${loadId}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Document could not be loaded.");
          const payload = await response.json();
          const record = payload.data ?? {};
          setContactId(String(record.contact_id ?? ""));
          setIssueDate(String(record.issue_date ?? todayISO()));
          setDueDate(String(record.due_date ?? todayISO()));
          setStatus(duplicateId ? "draft" : String(record.status ?? "draft"));
          setCurrency(String(record.currency ?? "INR"));
          setPlaceOfSupply(String(record.place_of_supply ?? ""));
          setNotes(String(record.notes ?? ""));
          setTerms(String(record.terms ?? ""));
          setDocumentNumber(duplicateId ? "" : String(isInvoice ? record.invoice_number ?? "" : record.bill_number ?? ""));
          setRoundOff(Number(record.round_off ?? 0));
          setTdsAmount(Number(record.tds_amount ?? 0));
          const nextLines = Array.isArray(record.line_items) && record.line_items.length
            ? record.line_items.map((line: Record<string, unknown>) => ({
                item_id: typeof line.item_id === "string" ? line.item_id : null,
                description: String(line.description ?? ""),
                quantity: Number(line.quantity ?? 1),
                rate: Number(line.rate ?? 0),
                discount: Number(line.discount ?? 0),
                tax_rate_id: typeof line.tax_rate_id === "string" ? line.tax_rate_id : null,
                gst_rate: 0
              }))
            : [emptyLine()];
          setLines(nextLines);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load transaction editor.");
      } finally {
        setLoading(false);
      }
    };

    void boot();
    return () => controller.abort();
  }, [apiBase, contactsApi, duplicateId, isInvoice, loadId]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0);
    const discountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
    const taxable = subtotal - discountTotal;
    const taxTotal = lines.reduce((sum, line) => sum + ((line.quantity * line.rate - line.discount) * line.gst_rate) / 100, 0);
    const total = taxable + taxTotal + (isInvoice ? roundOff : 0);
    return {
      subtotal: toMoney(subtotal),
      discount_total: toMoney(discountTotal),
      tax_total: toMoney(taxTotal),
      total: toMoney(total),
      balance_due: toMoney(total)
    };
  }, [isInvoice, lines, roundOff]);

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const applyItem = (index: number, itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    const tax = taxes.find((entry) => Number(entry.rate ?? 0) === Number(item?.gst_rate ?? 0));
    updateLine(index, {
      item_id: itemId || null,
      description: item?.name ?? "",
      rate: Number(isInvoice ? item?.sales_price ?? 0 : item?.purchase_price ?? 0),
      gst_rate: Number(item?.gst_rate ?? 0),
      tax_rate_id: tax?.id ?? null
    });
  };

  const submit = async () => {
    if (!contactId) {
      toast.error(`Select a ${isInvoice ? "customer" : "vendor"}.`);
      return;
    }
    const validLines = lines.filter((line) => line.description.trim().length > 0 && line.quantity > 0);
    if (!validLines.length) {
      toast.error("Add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        contact_id: contactId,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        currency,
        exchange_rate: 1,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        total: totals.total,
        balance_due: totals.balance_due,
        place_of_supply: placeOfSupply || null,
        notes: notes || null,
        line_items: validLines.map((line) => ({
          item_id: line.item_id,
          description: line.description,
          quantity: line.quantity,
          rate: line.rate,
          discount: line.discount,
          tax_rate_id: line.tax_rate_id,
          gst_rate: line.gst_rate
        }))
      };

      if (isInvoice) {
        payload.invoice_number = documentNumber || undefined;
        payload.round_off = roundOff;
        payload.terms = terms || null;
        payload.template_type = "classic";
      } else {
        payload.bill_number = documentNumber || undefined;
        payload.tds_amount = tdsAmount;
      }

      const response = await fetch(editId ? `${apiBase}/${editId}` : apiBase, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Document could not be saved.");
      }
      const id = json.data?.id;
      toast.success(`${isInvoice ? "Invoice" : "Bill"} saved.`);
      router.push(id ? `${listPath}/${id}` : listPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Document could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading {isInvoice ? "invoice" : "bill"} editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? `Edit ${isInvoice ? "Invoice" : "Bill"}` : `New ${isInvoice ? "Invoice" : "Bill"}`}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{isInvoice ? "Customer" : "Vendor"}</Label>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}</option>)}
            </select>
          </div>
          <div>
            <Label>{isInvoice ? "Invoice number" : "Bill number"}</Label>
            <Input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="mt-2" />
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
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {(isInvoice ? ["draft", "sent"] : ["draft", "approved"]).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <Label>Place of supply</Label>
            <Input value={placeOfSupply} onChange={(event) => setPlaceOfSupply(event.target.value)} className="mt-2" placeholder="27" />
          </div>
          {isInvoice ? (
            <div>
              <Label>Terms</Label>
              <Input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-2" />
            </div>
          ) : (
            <div>
              <Label>TDS amount</Label>
              <Input type="number" step="0.01" value={tdsAmount} onChange={(event) => setTdsAmount(Number(event.target.value || 0))} className="mt-2" />
            </div>
          )}
          {isInvoice ? (
            <div>
              <Label>Round off</Label>
              <Input type="number" step="0.01" value={roundOff} onChange={(event) => setRoundOff(Number(event.target.value || 0))} className="mt-2" />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, emptyLine()])}>Add line</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={`${index}-${line.item_id ?? "new"}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label>Item</Label>
                <select value={line.item_id ?? ""} onChange={(event) => applyItem(index, event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Manual</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} className="mt-2" />
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value || 0) })} className="mt-2" />
              </div>
              <div>
                <Label>Rate</Label>
                <Input type="number" step="0.01" value={line.rate} onChange={(event) => updateLine(index, { rate: Number(event.target.value || 0) })} className="mt-2" />
              </div>
              <div>
                <Label>Discount</Label>
                <Input type="number" step="0.01" value={line.discount} onChange={(event) => updateLine(index, { discount: Number(event.target.value || 0) })} className="mt-2" />
              </div>
              <div>
                <Label>GST rate</Label>
                <select
                  value={line.tax_rate_id ?? ""}
                  onChange={(event) => {
                    const tax = taxes.find((entry) => entry.id === event.target.value);
                    updateLine(index, { tax_rate_id: event.target.value || null, gst_rate: Number(tax?.rate ?? 0) });
                  }}
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">0%</option>
                  {taxes.map((tax) => <option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={() => setLines((current) => current.length === 1 ? [emptyLine()] : current.filter((_, rowIndex) => rowIndex !== index))}>Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{formatMoney(totals.discount_total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(totals.tax_total)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push(listPath)}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : `Save ${isInvoice ? "invoice" : "bill"}`}</Button>
      </div>
    </div>
  );
}
