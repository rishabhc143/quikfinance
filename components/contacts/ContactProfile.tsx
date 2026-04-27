"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type ContactRecord = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  state_code: string | null;
  payment_terms: number;
  opening_balance: number;
  currency: string;
  summary: {
    outstanding: number;
    overdue: number;
    open_documents: number;
    posted_payments: number;
  };
  documents: Array<{ id: string; number: string; issue_date: string; due_date: string; total: number; balance_due: number; status: string }>;
  payments: Array<{ id: string; payment_date: string; amount: number; method: string; reference: string | null; status: string }>;
};

export function ContactProfile({ kind, id }: { kind: "customer" | "vendor"; id: string }) {
  const [record, setRecord] = useState<ContactRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/${kind === "customer" ? "customers" : "vendors"}/${id}`);
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Profile could not be loaded.");
        setRecord(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Profile could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, kind]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading {kind} profile...</div>;
  }

  const documentPath = kind === "customer" ? "/invoices" : "/bills";
  const paymentPath = kind === "customer" ? "/payments/received" : "/payments/made";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{record.display_name}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{kind === "customer" ? "Customer" : "Vendor"} profile with live balances, documents, and payments.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/${kind === "customer" ? "customers" : "vendors"}/new?edit=${id}`}>Edit</Link>
            </Button>
            <Button asChild>
              <Link href={kind === "customer" ? "/invoices/new" : "/bills/new"}>{kind === "customer" ? "New invoice" : "New bill"}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-4 text-sm">
            <div className="text-muted-foreground">Outstanding</div>
            <div className="mt-2 text-xl font-semibold">{formatMoney(record.summary.outstanding)}</div>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <div className="text-muted-foreground">Overdue</div>
            <div className="mt-2 text-xl font-semibold">{formatMoney(record.summary.overdue)}</div>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <div className="text-muted-foreground">Open Documents</div>
            <div className="mt-2 text-xl font-semibold">{record.summary.open_documents}</div>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <div className="text-muted-foreground">Posted Payments</div>
            <div className="mt-2 text-xl font-semibold">{record.summary.posted_payments}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span>{record.email ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span>{record.phone ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">GSTIN</span>
              <span>{record.tax_id ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">State</span>
              <span>{record.state_code ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{record.payment_terms} days</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Opening Balance</span>
              <span>{formatMoney(record.opening_balance)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Currency</span>
              <span>{record.currency}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>{kind === "customer" ? "Invoices" : "Bills"}</CardTitle>
              <Button asChild variant="secondary">
                <Link href={documentPath}>Open all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.documents.length ? (
                record.documents.map((document) => (
                  <div key={document.id} className="grid gap-2 rounded-lg border p-4 text-sm md:grid-cols-5">
                    <Link href={`${documentPath}/${document.id}`} className="font-medium text-primary hover:underline">
                      {document.number}
                    </Link>
                    <span>{document.issue_date}</span>
                    <span>{document.due_date}</span>
                    <span>{formatMoney(document.total)}</span>
                    <span>{formatMoney(document.balance_due)} - {document.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No related documents yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Payments</CardTitle>
              <Button asChild variant="secondary">
                <Link href={paymentPath}>Open all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.payments.length ? (
                record.payments.map((payment) => (
                  <div key={payment.id} className="grid gap-2 rounded-lg border p-4 text-sm md:grid-cols-5">
                    <span className="font-medium">{payment.payment_date}</span>
                    <span>{formatMoney(payment.amount)}</span>
                    <span>{payment.method}</span>
                    <span>{payment.reference ?? "-"}</span>
                    <span>{payment.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No related payments yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

