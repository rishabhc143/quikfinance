"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils/currency";
import { todayISO } from "@/lib/utils/dates";

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

export function FixedAssetEditor() {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assetNumber, setAssetNumber] = useState("");
  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [salvageValue, setSalvageValue] = useState(0);
  const [usefulLifeMonths, setUsefulLifeMonths] = useState(36);
  const [depreciationMethod, setDepreciationMethod] = useState("straight_line");
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState(0);
  const [status, setStatus] = useState("active");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setEditId(search.get("edit"));
  }, []);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/fixed-assets/${editId}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error?.message ?? "Fixed asset could not be loaded.");
        const asset = json.data ?? {};
        setAssetNumber(String(asset.asset_number ?? ""));
        setName(String(asset.name ?? ""));
        setPurchaseDate(String(asset.purchase_date ?? todayISO()));
        setPurchaseCost(Number(asset.purchase_cost ?? 0));
        setSalvageValue(Number(asset.salvage_value ?? 0));
        setUsefulLifeMonths(Number(asset.useful_life_months ?? 36));
        setDepreciationMethod(String(asset.depreciation_method ?? "straight_line"));
        setAccumulatedDepreciation(Number(asset.accumulated_depreciation ?? 0));
        setStatus(String(asset.status ?? "active"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Fixed asset could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editId]);

  const metrics = useMemo(() => {
    const bookValue = Math.max(0, toMoney(purchaseCost - accumulatedDepreciation));
    const depreciable = Math.max(0, toMoney(purchaseCost - salvageValue));
    const monthly = usefulLifeMonths > 0 ? toMoney(depreciable / usefulLifeMonths) : 0;
    return { bookValue, monthly };
  }, [accumulatedDepreciation, purchaseCost, salvageValue, usefulLifeMonths]);

  const submit = async () => {
    if (!name.trim() || purchaseCost <= 0 || usefulLifeMonths <= 0) {
      toast.error("Name, purchase cost, and useful life are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editId ? `/api/v1/fixed-assets/${editId}` : "/api/v1/fixed-assets", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_number: assetNumber || undefined,
          name,
          purchase_date: purchaseDate,
          purchase_cost: purchaseCost,
          salvage_value: salvageValue,
          useful_life_months: usefulLifeMonths,
          depreciation_method: depreciationMethod,
          accumulated_depreciation: accumulatedDepreciation,
          status
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error?.message ?? "Fixed asset could not be saved.");
      toast.success("Fixed asset saved.");
      router.push(json.data?.id ? `/fixed-assets/${json.data.id}` : "/fixed-assets");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fixed asset could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Loading fixed asset editor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit fixed asset" : "New fixed asset"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Asset number</Label>
            <Input value={assetNumber} onChange={(event) => setAssetNumber(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="active">active</option>
              <option value="disposed">disposed</option>
              <option value="retired">retired</option>
            </select>
          </div>
          <div>
            <Label>Asset name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Purchase date</Label>
            <Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Purchase cost</Label>
            <Input type="number" step="0.01" value={purchaseCost} onChange={(event) => setPurchaseCost(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Salvage value</Label>
            <Input type="number" step="0.01" value={salvageValue} onChange={(event) => setSalvageValue(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Useful life (months)</Label>
            <Input type="number" value={usefulLifeMonths} onChange={(event) => setUsefulLifeMonths(Number(event.target.value || 0))} className="mt-2" />
          </div>
          <div>
            <Label>Depreciation method</Label>
            <select value={depreciationMethod} onChange={(event) => setDepreciationMethod(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="straight_line">straight_line</option>
              <option value="declining_balance">declining_balance</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Accumulated depreciation</Label>
            <Input type="number" step="0.01" value={accumulatedDepreciation} onChange={(event) => setAccumulatedDepreciation(Number(event.target.value || 0))} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Depreciation preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Book value</span><span>{formatMoney(metrics.bookValue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Straight-line monthly</span><span>{formatMoney(metrics.monthly)}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push("/fixed-assets")}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save fixed asset"}</Button>
      </div>
    </div>
  );
}
