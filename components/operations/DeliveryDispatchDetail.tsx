"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type DispatchRecord = {
  id: string;
  dispatch_number: string;
  sales_order_id?: string | null;
  customer_id?: string | null;
  warehouse_id?: string | null;
  dispatch_date: string;
  carrier_name: string;
  tracking_number?: string | null;
  shipped_value: number;
  status: string;
  proof_status: string;
  notes?: string | null;
};

export function DeliveryDispatchDetail({ id }: { id: string }) {
  const [dispatch, setDispatch] = useState<DispatchRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/delivery-dispatch/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Dispatch could not be loaded.");
        setDispatch(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dispatch could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  if (loading || !dispatch) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading dispatch...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{dispatch.dispatch_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{dispatch.carrier_name}</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/delivery-dispatch/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Dispatch date</span><span>{dispatch.dispatch_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tracking</span><span>{dispatch.tracking_number || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{dispatch.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Proof status</span><span>{dispatch.proof_status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipped value</span><span>{formatMoney(dispatch.shipped_value)}</span></div>
          {dispatch.sales_order_id ? <div className="flex justify-between"><span className="text-muted-foreground">Sales order</span><Link href={`/sales-orders/${dispatch.sales_order_id}`} className="text-primary underline underline-offset-2">Open</Link></div> : null}
          {dispatch.customer_id ? <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><Link href={`/customers/${dispatch.customer_id}`} className="text-primary underline underline-offset-2">Open</Link></div> : null}
          {dispatch.notes ? <div className="md:col-span-2"><span className="text-muted-foreground">Notes</span><p className="mt-1">{dispatch.notes}</p></div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
