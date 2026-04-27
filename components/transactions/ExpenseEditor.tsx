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
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

type Option = { id: string; display_name?: string; name?: string };

export function ExpenseEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Option[]>([]);
  const [accounts, setAccounts] = useState<Option[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [vendorId, setVendorId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isBillable, setIsBillable] = useState(false);
  const [status, setStatus] = useState("posted");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [vendorRes, accountRes, bankRes] = await Promise.all([
          fetch("/api/v1/vendors", { signal: controller.signal }),
          fetch("/api/v1/accounts", { signal: controller.signal }),
          fetch("/api/v1/bank-accounts", { signal: controller.signal })
        ]);
        const [vendorJson, accountJson, bankJson] = await Promise.all([
          vendorRes.json().catch(() => ({ data: [] })),
          accountRes.json().catch(() => ({ data: [] })),
          bankRes.json().catch(() => ({ data: [] }))
        ]);
        setVendors(Array.isArray(vendorJson.data) ? vendorJson.data : []);
        setAccounts(Array.isArray(accountJson.data) ? accountJson.data : []);
        setBankAccounts(Array.isArray(bankJson.data) ? bankJson.data : []);

        if (editId) {
          const response = await fetch(`/api/v1/expenses/${editId}`, { signal: controller.signal });
          const json = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(json.error?.message ?? "Expense could not be loaded.");
          const record = json.data ?? {};
          setExpenseDate(String(record.expense_date ?? todayISO()));
          setVendorId(String(record.vendor_id ?? ""));
          setAccountId(String(record.account_id ?? ""));
          setAmount(Number(record.amount ?? 0));
          setTaxAmount(Number(record.tax_amount ?? 0));
          setDescription(String(record.description ?? ""));
          setReceiptUrl(String(record.receipt_url ?? ""));
          setIsBillable(Boolean(record.is_billable));
          setStatus(String(record.status ?? "posted"));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Expense editor could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const submit = async () => {
    if (!accountId || !description.trim() || amount <= 0) {
      toast.error("Account, description, and amount are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        expense_date: expenseDate,
        vendor_id: vendorId || null,
        account_id: accountId,
        bank_account_id: bankAccountId || null,
        amount,
        tax_amount: taxAmount,
        currency: "INR",
        receipt_url: receiptUrl || null,
        is_billable: isBillable,
        description,
        status
      };
      const response = await fetch(editId ? `/api/v1/expenses/${editId}` : "/api/v1/expenses", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Expense could not be saved.");
      toast.success("Expense saved.");
      router.push(json.data?.id ? `/expenses/${json.data.id}` : "/expenses");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Expense could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading expense editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit Expense" : "New Expense"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="draft">draft</option>
              <option value="posted">posted</option>
            </select>
          </div>
          <div>
            <Label>Vendor</Label>
            <select value={vendorId} onChange={(event) => setVendorId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Optional vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.display_name ?? vendor.name ?? vendor.id}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link href="/vendors/new" className="text-primary underline underline-offset-2">
                New vendor
              </Link>
              {vendorId ? (
                <Link href={`/vendors/${vendorId}`} className="text-muted-foreground underline underline-offset-2">
                  Open vendor
                </Link>
              ) : null}
            </div>
          </div>
          <div>
            <Label>Expense account</Label>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name ?? account.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Bank / payment source</Label>
            <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Default bank</option>
              {bankAccounts.map((bankAccount) => (
                <option key={bankAccount.id} value={bankAccount.id}>
                  {bankAccount.name ?? bankAccount.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <input id="is_billable" type="checkbox" checked={isBillable} onChange={(event) => setIsBillable(event.target.checked)} className="h-4 w-4 rounded border-input accent-sky-600" />
            <Label htmlFor="is_billable">Billable expense</Label>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Tax amount</Label>
            <Input type="number" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" />
          </div>
          <div className="md:col-span-2">
            <Label>Receipt URL</Label>
            <Input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} className="mt-2" placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posting Preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expense amount</span>
            <span>{formatMoney(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recoverable tax</span>
            <span>{formatMoney(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold md:col-span-2">
            <span>Total cash impact</span>
            <span>{formatMoney(amount + taxAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/expenses")}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={saving}>
          {saving ? "Saving..." : "Save expense"}
        </Button>
      </div>
    </div>
  );
}
