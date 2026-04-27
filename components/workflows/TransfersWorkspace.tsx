"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type BankAccountRow = {
  id: string;
  name?: string;
  institution_name?: string | null;
  current_balance?: number;
  is_active?: boolean;
};

export function TransfersWorkspace() {
  const bankAccounts = useQuery({
    queryKey: ["transfer-bank-accounts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/bank-accounts");
      const payload = (await response.json()) as { data?: BankAccountRow[] };
      if (!response.ok) {
        return [];
      }
      return payload.data ?? [];
    }
  });

  const metrics = useMemo(() => {
    const rows = bankAccounts.data ?? [];
    return {
      activeAccounts: rows.filter((row) => row.is_active !== false).length,
      treasuryBalance: rows.reduce((sum, row) => sum + Number(row.current_balance ?? 0), 0),
      transferPairs: Math.max(rows.length - 1, 0),
      accounts: rows
    };
  }, [bankAccounts.data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active bank accounts</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.activeAccounts}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Treasury balance</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(metrics.treasuryBalance)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Potential transfer pairs</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.transferPairs}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Reconciliation path</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Banking</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Internal Transfer Runbook</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metrics.accounts.map((account) => (
              <div key={account.id} className="rounded-2xl border p-4">
                <p className="font-semibold">{account.name ?? account.id}</p>
                <p className="mt-1 text-sm text-muted-foreground">{account.institution_name ?? "Bank account"} · {formatMoney(Number(account.current_balance ?? 0))}</p>
              </div>
            ))}
            {metrics.accounts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No bank accounts found. Create bank accounts before planning transfers.</div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Transfer Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/40 p-3">Use paired source and destination tracking for inter-bank movements.</div>
              <div className="rounded-xl bg-muted/40 p-3">After posting the transfer, confirm it in bank reconciliation to avoid duplicate treasury movement.</div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary"><Link href="/bank-accounts">Open bank accounts</Link></Button>
                <Button asChild variant="secondary"><Link href="/payment-operations">Payment operations</Link></Button>
                <Button asChild variant="secondary"><Link href="/exception-queue">Review exceptions</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
