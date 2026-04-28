"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/currency";

type AssetRecord = {
  id: string;
  asset_number: string;
  name: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  status: string;
};

export function FixedAssetDetail({ id }: { id: string }) {
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/fixed-assets/${id}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Fixed asset could not be loaded.");
        setAsset(json.data ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Fixed asset could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [id]);

  const derived = useMemo(() => {
    const purchaseCost = Number(asset?.purchase_cost ?? 0);
    const salvage = Number(asset?.salvage_value ?? 0);
    const accumulated = Number(asset?.accumulated_depreciation ?? 0);
    const usefulLife = Number(asset?.useful_life_months ?? 0);
    const bookValue = Math.max(0, purchaseCost - accumulated);
    const monthly = usefulLife > 0 ? Math.max(0, (purchaseCost - salvage) / usefulLife) : 0;
    return { bookValue, monthly };
  }, [asset]);

  if (loading || !asset) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading fixed asset...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{asset.asset_number}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
          </div>
          <Button asChild variant="secondary"><Link href={`/fixed-assets/new?edit=${id}`}>Edit</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Purchase date</span><span>{asset.purchase_date}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{asset.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Purchase cost</span><span>{formatMoney(asset.purchase_cost)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Book value</span><span>{formatMoney(derived.bookValue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Accumulated depreciation</span><span>{formatMoney(asset.accumulated_depreciation)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Monthly depreciation</span><span>{formatMoney(derived.monthly)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Useful life</span><span>{asset.useful_life_months} months</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{asset.depreciation_method}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
