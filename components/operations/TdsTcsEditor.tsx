"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO } from "@/lib/utils/dates";

type PartyOption = { id: string; display_name: string };
type TransactionOption = { id: string; invoice_number?: string; bill_number?: string };

export function TdsTcsEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<PartyOption[]>([]);
  const [vendors, setVendors] = useState<PartyOption[]>([]);
  const [bills, setBills] = useState<TransactionOption[]>([]);
  const [invoices, setInvoices] = useState<TransactionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionCode, setSectionCode] = useState("");
  const [taxKind, setTaxKind] = useState("tds");
  const [transactionType, setTransactionType] = useState("bill");
  const [transactionId, setTransactionId] = useState("");
  const [partyType, setPartyType] = useState("vendor");
  const [partyId, setPartyId] = useState("");
  const [assessmentDate, setAssessmentDate] = useState(todayISO());
  const [baseAmount, setBaseAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [customerRes, vendorRes, billRes, invoiceRes, detailRes] = await Promise.all([
          fetch("/api/v1/customers", { signal: controller.signal }),
          fetch("/api/v1/vendors", { signal: controller.signal }),
          fetch("/api/v1/bills", { signal: controller.signal }),
          fetch("/api/v1/invoices", { signal: controller.signal }),
          editId ? fetch(`/api/v1/tds-tcs/${editId}`, { signal: controller.signal }) : Promise.resolve(null)
        ]);
        const customerJson = await customerRes.json().catch(() => ({ data: [] }));
        const vendorJson = await vendorRes.json().catch(() => ({ data: [] }));
        const billJson = await billRes.json().catch(() => ({ data: [] }));
        const invoiceJson = await invoiceRes.json().catch(() => ({ data: [] }));
        setCustomers(Array.isArray(customerJson.data) ? customerJson.data : []);
        setVendors(Array.isArray(vendorJson.data) ? vendorJson.data : []);
        setBills(Array.isArray(billJson.data) ? billJson.data : []);
        setInvoices(Array.isArray(invoiceJson.data) ? invoiceJson.data : []);
        if (detailRes) {
          const detailJson = await detailRes.json().catch(() => ({}));
          if (!detailRes.ok) throw new Error(detailJson.error?.message ?? "Tax record could not be loaded.");
          const record = detailJson.data ?? {};
          setSectionCode(String(record.section_code ?? ""));
          setTaxKind(String(record.tax_kind ?? "tds"));
          setTransactionType(String(record.transaction_type ?? "bill"));
          setTransactionId(String(record.transaction_id ?? ""));
          setPartyType(String(record.party_type ?? "vendor"));
          setPartyId(String(record.party_id ?? ""));
          setAssessmentDate(String(record.assessment_date ?? todayISO()));
          setBaseAmount(Number(record.base_amount ?? 0));
          setTaxRate(Number(record.tax_rate ?? 0));
          setTaxAmount(Number(record.tax_amount ?? 0));
          setStatus(String(record.status ?? "draft"));
          setNotes(String(record.notes ?? ""));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Tax record could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const parties = useMemo(() => (partyType === "customer" ? customers : vendors), [customers, partyType, vendors]);
  const transactions = useMemo(() => {
    if (transactionType === "bill") return bills;
    if (transactionType === "invoice") return invoices;
    return [];
  }, [bills, invoices, transactionType]);

  useEffect(() => {
    setTaxAmount(Number(((baseAmount * taxRate) / 100).toFixed(2)));
  }, [baseAmount, taxRate]);

  const submit = async () => {
    if (!sectionCode.trim()) {
      toast.error("Section code is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/tds-tcs/${editId}` : "/api/v1/tds-tcs", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_code: sectionCode,
          tax_kind: taxKind,
          transaction_type: transactionType,
          transaction_id: transactionId || null,
          party_type: partyType,
          party_id: partyId || null,
          assessment_date: assessmentDate,
          base_amount: baseAmount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          status,
          notes: notes || null
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Tax record could not be saved.");
      toast.success("Tax record saved.");
      router.push(json.data?.id ? `/tds-tcs/${json.data.id}` : "/tds-tcs");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tax record could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading tax record editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editId ? "Edit tax record" : "New tax record"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Section code</Label>
            <Input value={sectionCode} onChange={(event) => setSectionCode(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Assessment date</Label>
            <Input type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Tax kind</Label>
            <select value={taxKind} onChange={(event) => setTaxKind(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="tds">tds</option>
              <option value="tcs">tcs</option>
            </select>
          </div>
          <div>
            <Label>Transaction type</Label>
            <select value={transactionType} onChange={(event) => setTransactionType(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["bill", "invoice", "payment", "journal"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label>{transactionType === "bill" ? "Bill" : transactionType === "invoice" ? "Invoice" : "Transaction ID"}</Label>
            {transactionType === "bill" || transactionType === "invoice" ? (
              <>
                <select value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">Optional link</option>
                  {transactions.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {transactionType === "bill" ? (transaction.bill_number ?? transaction.id) : (transaction.invoice_number ?? transaction.id)}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href={transactionType === "bill" ? "/bills" : "/invoices"} className="text-primary underline underline-offset-2">
                    Open {transactionType === "bill" ? "bills" : "invoices"}
                  </Link>
                  {transactionId ? (
                    <Link href={`${transactionType === "bill" ? "/bills" : "/invoices"}/${transactionId}`} className="text-muted-foreground underline underline-offset-2">
                      Open selected
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="mt-2" />
            )}
          </div>
          <div>
            <Label>Party type</Label>
            <select value={partyType} onChange={(event) => { setPartyType(event.target.value); setPartyId(""); }} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="vendor">vendor</option>
              <option value="customer">customer</option>
            </select>
          </div>
          <div>
            <Label>Party</Label>
            <select value={partyId} onChange={(event) => setPartyId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional party</option>
              {parties.map((party) => <option key={party.id} value={party.id}>{party.display_name}</option>)}
            </select>
            <div className="mt-2 flex gap-3 text-xs">
              <Link href={partyType === "customer" ? "/customers/new" : "/vendors/new"} className="text-primary underline underline-offset-2">New {partyType}</Link>
              {partyId ? <Link href={`${partyType === "customer" ? "/customers" : "/vendors"}/${partyId}`} className="text-muted-foreground underline underline-offset-2">Open {partyType}</Link> : null}
            </div>
          </div>
          <div>
            <Label>Base amount</Label>
            <Input type="number" step="0.01" value={baseAmount} onChange={(event) => setBaseAmount(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Tax rate</Label>
            <Input type="number" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Tax amount</Label>
            <Input type="number" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["draft", "review", "posted", "filed"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/tds-tcs")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save tax record"}</Button>
      </div>
    </div>
  );
}
