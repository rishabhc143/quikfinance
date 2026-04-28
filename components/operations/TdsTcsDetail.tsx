"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type RecordType = {
  id: string;
  section_code: string;
  tax_kind: string;
  transaction_type: string;
  transaction_id?: string | null;
  party_type: string;
  party_id?: string | null;
  assessment_date: string;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  status: string;
  notes?: string | null;
};

export function TdsTcsDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<RecordType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/tds-tcs/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Tax record could not be loaded.");
        setRecord(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Tax record could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !record) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading tax record...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{record.section_code}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{record.tax_kind.toUpperCase()} on {record.transaction_type}</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/tds-tcs/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Assessment date</span><span>{record.assessment_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{record.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Base amount</span><span>{formatMoney(record.base_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax amount</span><span>{formatMoney(record.tax_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax rate</span><span>{record.tax_rate}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Party type</span><span>{record.party_type}</span></div>
          {record.party_id ? <div className="flex justify-between"><span className="text-muted-foreground">Party</span><Link href={`${record.party_type === "customer" ? "/customers" : "/vendors"}/${record.party_id}`} className="text-primary underline underline-offset-2">Open {record.party_type}</Link></div> : null}
          {record.transaction_id ? <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span>{record.transaction_id}</span></div> : null}
          {record.notes ? <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><p className="mt-1">{record.notes}</p></div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
