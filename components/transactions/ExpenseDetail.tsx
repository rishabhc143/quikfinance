"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type ExpenseRecord = {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  status: string;
  receipt_url: string | null;
  is_billable: boolean;
  account_id: string;
  vendor_id: string | null;
};

export function ExpenseDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<ExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/expenses/${id}`);
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Expense could not be loaded.");
        setRecord(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Expense could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading expense...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{record.description}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">Expense detail with posting summary and receipt reference.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/expenses/new?edit=${id}`}>Edit</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{record.expense_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{record.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span>{formatMoney(record.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(record.tax_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billable</span>
            <span>{record.is_billable ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cash impact</span>
            <span>{formatMoney(record.amount + record.tax_amount)}</span>
          </div>
          {record.receipt_url ? (
            <div className="md:col-span-2">
              <a href={record.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline">
                Open receipt
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
