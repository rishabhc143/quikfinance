"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ITCRecord = {
  id: string;
  vendor_name: string;
  vendor_gstin: string | null;
  bill_number: string;
  taxable_value: number;
  tax_amount: number;
  gstr2b_tax_amount: number;
  match_status: "matched" | "partial" | "unmatched" | "blocked";
  action_status: "review" | "claim" | "hold" | "rejected";
  created_at: string;
};

type WorkflowResponse = {
  records: ITCRecord[];
  total: number;
};

function matchTone(status: ITCRecord["match_status"]) {
  if (status === "matched") return "success" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "partial") return "warning" as const;
  return "muted" as const;
}

function actionTone(status: ITCRecord["action_status"]) {
  if (status === "claim") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "hold") return "warning" as const;
  return "info" as const;
}

export function ITCReconciliationWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [taxableValue, setTaxableValue] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [gstr2bTaxAmount, setGstr2bTaxAmount] = useState("0");

  const itc = useQuery({
    queryKey: ["itc-reconciliation", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/itc-reconciliation${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "ITC reconciliation could not be loaded.");
      return payload.data;
    }
  });

  const createRecord = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/itc-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: vendorName,
          vendor_gstin: vendorGstin || null,
          bill_number: billNumber,
          taxable_value: Number(taxableValue || 0),
          tax_amount: Number(taxAmount || 0),
          gstr2b_tax_amount: Number(gstr2bTaxAmount || 0),
          match_status: "unmatched",
          action_status: "review"
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "ITC record could not be created.");
    },
    onSuccess: async () => {
      toast.success("ITC record created.");
      setVendorName("");
      setVendorGstin("");
      setBillNumber("");
      setTaxableValue("0");
      setTaxAmount("0");
      setGstr2bTaxAmount("0");
      await queryClient.invalidateQueries({ queryKey: ["itc-reconciliation"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "ITC record could not be created.")
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<ITCRecord, "match_status" | "action_status">> }) => {
      const response = await fetch(`/api/v1/workflows/itc-reconciliation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "ITC update failed.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["itc-reconciliation"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "ITC update failed.")
  });

  const records = useMemo(() => itc.data?.records ?? [], [itc.data?.records]);
  const matchedAmount = useMemo(() => records.filter((record) => record.match_status === "matched").reduce((sum, record) => sum + record.tax_amount, 0), [records]);
  const blockedCount = useMemo(() => records.filter((record) => record.match_status === "blocked").length, [records]);
  const reviewCount = useMemo(() => records.filter((record) => record.action_status === "review").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total records</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{records.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Matched ITC</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{matchedAmount.toLocaleString("en-IN")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Blocked</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{blockedCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Review queue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reviewCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Add ITC reconciliation record</CardTitle>
          <Button asChild variant="secondary"><Link href="/bills">Open Bills</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="itc-vendor">Vendor name</Label>
              <Input id="itc-vendor" value={vendorName} onChange={(event) => setVendorName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="itc-gstin">Vendor GSTIN</Label>
              <Input id="itc-gstin" value={vendorGstin} onChange={(event) => setVendorGstin(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="itc-bill-number">Bill number</Label>
              <Input id="itc-bill-number" value={billNumber} onChange={(event) => setBillNumber(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="itc-taxable">Taxable value</Label>
              <Input id="itc-taxable" type="number" value={taxableValue} onChange={(event) => setTaxableValue(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="itc-tax">Tax amount</Label>
              <Input id="itc-tax" type="number" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="itc-2b-tax">2B tax amount</Label>
              <Input id="itc-2b-tax" type="number" value={gstr2bTaxAmount} onChange={(event) => setGstr2bTaxAmount(event.target.value)} />
            </div>
            <div className="lg:col-span-2 flex items-end justify-end">
              <Button onClick={() => createRecord.mutate()} disabled={createRecord.isPending || !vendorName.trim() || !billNumber.trim()}>
                {createRecord.isPending ? "Creating..." : "Create record"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>ITC queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ITC records" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {itc.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading ITC records...</div> : null}
          {itc.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(itc.error as Error).message}</div> : null}
          {!itc.isLoading && !itc.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No ITC records found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.vendor_name}</p>
                    <Badge tone={matchTone(record.match_status)}>{record.match_status}</Badge>
                    <Badge tone={actionTone(record.action_status)}>{record.action_status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Bill: {record.bill_number}</span>
                    <span>Tax: {record.tax_amount.toLocaleString("en-IN")}</span>
                    <span>2B: {record.gstr2b_tax_amount.toLocaleString("en-IN")}</span>
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => updateRecord.mutate({ id: record.id, patch: { match_status: "matched", action_status: "claim" } })}>Match & claim</Button>
                  <Button variant="ghost" onClick={() => updateRecord.mutate({ id: record.id, patch: { match_status: "partial", action_status: "hold" } })}>Hold</Button>
                  <Button variant="destructive" onClick={() => updateRecord.mutate({ id: record.id, patch: { match_status: "blocked", action_status: "rejected" } })}>Block</Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
