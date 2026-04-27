"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/currency";

type BankAccount = { id: string; name: string };
type DocumentKind = "invoice" | "bill" | "quotation";

type DocumentRecord = {
  id: string;
  invoice_number?: string;
  bill_number?: string;
  quotation_number?: string;
  customer?: string;
  vendor?: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  balance_due?: number;
  notes?: string | null;
  terms?: string | null;
  template_type?: string | null;
  line_items?: Array<{ id?: string; description: string; quantity: number; rate: number; discount?: number; tax_amount?: number; line_total?: number }>;
};

function kindLabel(kind: DocumentKind) {
  if (kind === "invoice") return "invoice";
  if (kind === "bill") return "bill";
  return "quotation";
}

export function DocumentDetail({ kind, id }: { kind: DocumentKind; id: string }) {
  const isInvoice = kind === "invoice";
  const isBill = kind === "bill";
  const isQuotation = kind === "quotation";
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(isInvoice ? "UPI" : "Bank Transfer");
  const [reference, setReference] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [fetch(`/api/v1/${isInvoice ? "invoices" : isBill ? "bills" : "quotations"}/${id}`)];
      if (!isQuotation) {
        requests.push(fetch("/api/v1/bank-accounts"));
      }

      const [documentResponse, bankResponse] = await Promise.all(requests);
      const documentJson = await documentResponse.json().catch(() => ({}));
      const bankJson = bankResponse ? await bankResponse.json().catch(() => ({ data: [] })) : { data: [] };
      if (!documentResponse.ok) throw new Error(documentJson.error?.message ?? "Document could not be loaded.");

      setDocument(documentJson.data ?? null);
      setAmount(String(documentJson.data?.balance_due ?? ""));
      setBankAccounts(Array.isArray(bankJson.data) ? bankJson.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Document could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id, isBill, isInvoice, isQuotation]);

  useEffect(() => {
    void load();
  }, [load]);

  const recordPayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/${isInvoice ? "invoices" : "bills"}/${id}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_date: new Date().toISOString().slice(0, 10),
          amount: Number(amount),
          method,
          reference: reference || null,
          bank_account_id: bankAccountId || null,
          currency: "INR",
          exchange_rate: 1
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Payment could not be recorded.");
      toast.success("Payment recorded.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be recorded.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !document) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading {kindLabel(kind)}...</div>;
  }

  const title = isInvoice ? document.invoice_number : isBill ? document.bill_number : document.quotation_number;
  const counterpart = isBill ? document.vendor : document.customer;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{counterpart}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary"><Link href={`/${isInvoice ? "invoices" : isBill ? "bills" : "quotations"}/new?edit=${id}`}>Edit</Link></Button>
            {isInvoice ? <Button asChild variant="secondary"><Link href={`/invoices/${id}/payment-link`}>Payment link</Link></Button> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Issue date</span><span>{document.issue_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{isQuotation ? "Expiry date" : "Due date"}</span><span>{document.due_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{document.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatMoney(document.total)}</span></div>
          {!isQuotation ? (
            <div className="flex justify-between font-semibold"><span>Balance due</span><span>{formatMoney(Number(document.balance_due ?? 0))}</span></div>
          ) : null}
          {document.template_type ? <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span>{document.template_type}</span></div> : null}
          {document.terms ? <div className="md:col-span-2"><span className="text-muted-foreground">Terms</span><p className="mt-1">{document.terms}</p></div> : null}
          {document.notes ? <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><p className="mt-1">{document.notes}</p></div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(document.line_items ?? []).length > 0 ? (document.line_items ?? []).map((line, index) => (
            <div key={line.id ?? index} className="grid gap-2 rounded-lg border p-4 text-sm md:grid-cols-5">
              <div className="font-medium md:col-span-2">{line.description}</div>
              <div>Qty: {line.quantity}</div>
              <div>Rate: {formatMoney(Number(line.rate ?? 0))}</div>
              <div>Total: {formatMoney(Number(line.line_total ?? line.quantity * line.rate))}</div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No line items available.</p>}
        </CardContent>
      </Card>

      {!isQuotation && Number(document.balance_due ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label>Method</Label>
              <Input value={method} onChange={(event) => setMethod(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label>Bank account</Label>
              <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Default bank</option>
                {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
              <div className="mt-2 flex gap-3 text-xs">
                <Link href="/bank-accounts/new" className="text-primary underline underline-offset-2">New bank account</Link>
                {bankAccountId ? <Link href={`/bank-accounts/${bankAccountId}`} className="text-muted-foreground underline underline-offset-2">Open bank account</Link> : null}
              </div>
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button type="button" onClick={recordPayment} disabled={saving}>{saving ? "Recording..." : "Record payment"}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
