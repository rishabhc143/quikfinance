"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type BankAccountDetail = {
  id: string;
  account_id: string | null;
  name: string;
  institution_name: string | null;
  account_number_last4: string | null;
  currency: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  summary: {
    posted_receipts: number;
    posted_payouts: number;
    imported_statement_lines: number;
    last_reconciled_at: string | null;
  };
  payments: Array<{
    id: string;
    payment_type: string;
    payment_date: string;
    amount: number;
    method: string;
    reference: string | null;
    status: string;
    memo: string | null;
  }>;
  bank_transactions: Array<{
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    reference: string | null;
    status: string;
  }>;
  reconciliations: Array<{
    id: string;
    statement_start: string;
    statement_end: string;
    difference: number;
    status: string;
    created_at: string;
  }>;
};

async function readDetail(id: string) {
  const response = await fetch(`/api/v1/bank-accounts/${id}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as { data?: BankAccountDetail; error?: { message?: string } };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Bank account could not be loaded.");
  }
  return payload.data;
}

export function BankAccountDetailWorkspace({ id }: { id: string }) {
  const account = useQuery({
    queryKey: ["bank-account-detail", id],
    queryFn: () => readDetail(id)
  });

  const data = account.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={data?.name ?? "Bank Account"}
        description={`Operational banking view for ${data?.institution_name ?? "this bank account"}, including payments, statement imports, and reconciliation history.`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Current balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(data?.current_balance ?? 0)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted receipts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.posted_receipts ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Posted payouts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.posted_payouts ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Statement imports</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.summary.imported_statement_lines ?? 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Account controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data?.institution_name ?? "Bank"} {data?.account_number_last4 ? `- ending ${data.account_number_last4}` : ""} - {data?.currency ?? "INR"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href={`/bank-accounts/${id}/reconciliation`}>Open reconciliation</Link></Button>
            <Button asChild variant="secondary"><Link href={`/bank-accounts/new?edit=${id}`}>Edit account</Link></Button>
            <Button asChild variant="secondary"><Link href="/transfers">Transfers</Link></Button>
            <Button asChild variant="secondary"><Link href="/payment-operations">Payment ops</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="mt-2"><StatusBadge status={data?.is_active === false ? "inactive" : "active"} /></div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Last reconciled</div>
            <div className="mt-2 text-sm font-medium">{data?.summary.last_reconciled_at ? new Date(data.summary.last_reconciled_at).toLocaleString("en-IN") : "Not reconciled yet"}</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Linked ledger account</div>
            <div className="mt-2 text-sm font-medium">{data?.account_id ?? "Not linked"}</div>
          </div>
        </CardContent>
      </Card>

      {account.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading bank account details...</div> : null}
      {account.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(account.error as Error).message}</div> : null}

      {!account.isLoading && !account.isError ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.payments ?? []).length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No payments are linked to this bank account yet.</div> : null}
              {(data?.payments ?? []).map((payment) => (
                <div key={payment.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">{payment.reference ?? payment.id}</div>
                      <div className="text-sm text-muted-foreground">{payment.payment_date} - {payment.method} - {payment.payment_type}</div>
                      <div className="text-sm">{payment.memo ?? "No memo provided."}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(payment.amount)}</div>
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Imported bank lines</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data?.bank_transactions ?? []).length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No statement lines have been imported for this account yet.</div> : null}
              {(data?.bank_transactions ?? []).map((row) => (
                <div key={row.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">{row.description}</div>
                      <div className="text-sm text-muted-foreground">{row.transaction_date} - {row.reference ?? "No reference"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(row.amount)}</div>
                      <StatusBadge status={row.status} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!account.isLoading && !account.isError ? (
        <Card>
          <CardHeader><CardTitle>Recent reconciliations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.reconciliations ?? []).length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No reconciliation periods have been saved yet.</div> : null}
            {(data?.reconciliations ?? []).map((row) => (
              <div key={row.id} className="grid gap-2 rounded-2xl border p-4 text-sm md:grid-cols-5">
                <span>{row.statement_start}</span>
                <span>{row.statement_end}</span>
                <span>{formatMoney(row.difference)}</span>
                <span>{new Date(row.created_at).toLocaleDateString("en-IN")}</span>
                <span><StatusBadge status={row.status} /></span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
