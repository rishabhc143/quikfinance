"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDIAN_STATE_OPTIONS } from "@/lib/india";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

type CompanyPayload = {
  name: string;
  legal_name?: string | null;
  business_type?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  country?: string | null;
  pin_code?: string | null;
  pan?: string | null;
  gst_registered?: boolean;
  gstin?: string | null;
  gst_filing_frequency?: string;
  place_of_supply?: string | null;
  base_currency?: string;
  fiscal_year_start_month?: number;
  fiscal_year_start_date?: string | null;
  fiscal_year_end_date?: string | null;
  accounting_method?: string;
  timezone?: string;
  invoice_prefix?: string;
  invoice_next_number?: number;
  payment_terms?: string;
  preferred_language?: "en" | "hi";
  setup_completed?: boolean;
  checklist?: ChecklistItem[];
  progress_percent?: number;
  required_missing?: string[];
};

const initialValues: CompanyPayload = {
  name: "",
  legal_name: "",
  business_type: "proprietorship",
  industry: "",
  email: "",
  phone: "",
  website: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_code: "27",
  country: "India",
  pin_code: "",
  pan: "",
  gst_registered: false,
  gstin: "",
  gst_filing_frequency: "monthly",
  place_of_supply: "27",
  base_currency: "INR",
  fiscal_year_start_month: 4,
  fiscal_year_start_date: "",
  fiscal_year_end_date: "",
  accounting_method: "accrual",
  timezone: "Asia/Kolkata",
  invoice_prefix: "INV",
  invoice_next_number: 1,
  payment_terms: "Net 30",
  preferred_language: "en"
};

export function CompanySetupForm({ mode }: { mode: "onboarding" | "settings" }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CompanyPayload>(initialValues);

  const company = useQuery({
    queryKey: ["company-setup"],
    queryFn: async () => {
      const response = await fetch("/api/company", { cache: "no-store" });
      const payload = (await response.json()) as { data?: CompanyPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Company setup could not be loaded.");
      }
      return payload.data;
    }
  });

  useEffect(() => {
    if (company.data) {
      setValues((current) => ({ ...current, ...company.data }));
    }
  }, [company.data]);

  const saveCompany = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = (await response.json()) as { data?: CompanyPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Company setup could not be saved.");
      }
      return payload.data;
    },
    onSuccess: async (data) => {
      toast.success("Company settings saved.");
      setValues((current) => ({ ...current, ...data }));
      await queryClient.invalidateQueries({ queryKey: ["company-setup"] });
      await queryClient.invalidateQueries({ queryKey: ["company-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Company settings could not be saved.")
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/accounts/defaults", { method: "POST" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Default accounts could not be seeded.");
      }
    },
    onSuccess: async () => {
      toast.success("Default chart of accounts ensured.");
      await queryClient.invalidateQueries({ queryKey: ["company-setup"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Default accounts could not be seeded.")
  });

  const completeSetup = useMutation({
    mutationFn: async () => {
      const saveResponse = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!saveResponse.ok) {
        const savePayload = (await saveResponse.json()) as { error?: { message?: string } };
        throw new Error(savePayload.error?.message ?? "Company setup could not be saved.");
      }

      const response = await fetch("/api/company/complete-setup", { method: "POST" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Company setup is incomplete.");
      }
    },
    onSuccess: () => {
      toast.success("Company setup completed.");
      window.location.href = "/dashboard";
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Company setup could not be completed.")
  });

  const companyData = company.data as CompanyPayload | undefined;
  const checklist = useMemo(() => companyData?.checklist ?? [], [companyData?.checklist]);
  const progress = companyData?.progress_percent ?? 0;

  const setField = <K extends keyof CompanyPayload>(key: K, value: CompanyPayload[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {mode === "onboarding" ? (
        <Card>
          <CardHeader>
            <CardTitle>Setup progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {checklist.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <span className={item.done ? "text-emerald-600" : "text-muted-foreground"}>{item.done ? "Done" : "Pending"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Company profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="name">Company name</Label><Input id="name" value={values.name ?? ""} onChange={(e) => setField("name", e.target.value)} /></div>
          <div><Label htmlFor="legal_name">Legal name</Label><Input id="legal_name" value={values.legal_name ?? ""} onChange={(e) => setField("legal_name", e.target.value)} /></div>
          <div>
            <Label htmlFor="business_type">Business type</Label>
            <select id="business_type" value={values.business_type ?? "proprietorship"} onChange={(e) => setField("business_type", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="proprietorship">Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="llp">LLP</option>
              <option value="pvt_ltd">Pvt Ltd</option>
              <option value="public_ltd">Public Ltd</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><Label htmlFor="industry">Industry</Label><Input id="industry" value={values.industry ?? ""} onChange={(e) => setField("industry", e.target.value)} /></div>
          <div><Label htmlFor="email">Business email</Label><Input id="email" type="email" value={values.email ?? ""} onChange={(e) => setField("email", e.target.value)} /></div>
          <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={values.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} /></div>
          <div><Label htmlFor="website">Website</Label><Input id="website" value={values.website ?? ""} onChange={(e) => setField("website", e.target.value)} /></div>
          <div><Label htmlFor="pan">PAN</Label><Input id="pan" value={values.pan ?? ""} onChange={(e) => setField("pan", e.target.value.toUpperCase())} /></div>
          <div className="md:col-span-2"><Label htmlFor="address_line1">Registered address</Label><Input id="address_line1" value={values.address_line1 ?? ""} onChange={(e) => setField("address_line1", e.target.value)} /></div>
          <div><Label htmlFor="address_line2">Address line 2</Label><Input id="address_line2" value={values.address_line2 ?? ""} onChange={(e) => setField("address_line2", e.target.value)} /></div>
          <div><Label htmlFor="city">City</Label><Input id="city" value={values.city ?? ""} onChange={(e) => setField("city", e.target.value)} /></div>
          <div>
            <Label htmlFor="state_code">State</Label>
            <select id="state_code" value={values.state_code ?? "27"} onChange={(e) => setField("state_code", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {INDIAN_STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div><Label htmlFor="country">Country</Label><Input id="country" value={values.country ?? ""} onChange={(e) => setField("country", e.target.value)} /></div>
          <div><Label htmlFor="pin_code">PIN code</Label><Input id="pin_code" value={values.pin_code ?? ""} onChange={(e) => setField("pin_code", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Financial settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="base_currency">Base currency</Label><Input id="base_currency" value={values.base_currency ?? "INR"} onChange={(e) => setField("base_currency", e.target.value.toUpperCase())} /></div>
          <div>
            <Label htmlFor="accounting_method">Accounting method</Label>
            <select id="accounting_method" value={values.accounting_method ?? "accrual"} onChange={(e) => setField("accounting_method", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="cash">Cash</option>
              <option value="accrual">Accrual</option>
            </select>
          </div>
          <div><Label htmlFor="fiscal_year_start_date">Fiscal year start</Label><Input id="fiscal_year_start_date" type="date" value={values.fiscal_year_start_date ?? ""} onChange={(e) => setField("fiscal_year_start_date", e.target.value)} /></div>
          <div><Label htmlFor="fiscal_year_end_date">Fiscal year end</Label><Input id="fiscal_year_end_date" type="date" value={values.fiscal_year_end_date ?? ""} onChange={(e) => setField("fiscal_year_end_date", e.target.value)} /></div>
          <div><Label htmlFor="invoice_prefix">Invoice prefix</Label><Input id="invoice_prefix" value={values.invoice_prefix ?? "INV"} onChange={(e) => setField("invoice_prefix", e.target.value.toUpperCase())} /></div>
          <div><Label htmlFor="invoice_next_number">Invoice next number</Label><Input id="invoice_next_number" type="number" value={values.invoice_next_number ?? 1} onChange={(e) => setField("invoice_next_number", Number(e.target.value || 1))} /></div>
          <div>
            <Label htmlFor="payment_terms">Payment terms</Label>
            <select id="payment_terms" value={values.payment_terms ?? "Net 30"} onChange={(e) => setField("payment_terms", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="Due on receipt">Due on receipt</option>
              <option value="Net 7">Net 7</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div><Label htmlFor="timezone">Timezone</Label><Input id="timezone" value={values.timezone ?? "Asia/Kolkata"} onChange={(e) => setField("timezone", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>GST / tax settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="gst_registered">GST registered</Label>
            <select id="gst_registered" value={values.gst_registered ? "yes" : "no"} onChange={(e) => setField("gst_registered", e.target.value === "yes")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" value={values.gstin ?? ""} onChange={(e) => setField("gstin", e.target.value.toUpperCase())} /></div>
          <div>
            <Label htmlFor="place_of_supply">Place of supply</Label>
            <select id="place_of_supply" value={values.place_of_supply ?? "27"} onChange={(e) => setField("place_of_supply", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              {INDIAN_STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="gst_filing_frequency">GST filing frequency</Label>
            <select id="gst_filing_frequency" value={values.gst_filing_frequency ?? "monthly"} onChange={(e) => setField("gst_filing_frequency", e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Chart of accounts</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            {seedDefaults.isPending ? "Creating..." : "Auto-create default chart of accounts"}
          </Button>
          <Button asChild variant="secondary"><a href="/chart-of-accounts">Review chart of accounts</a></Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending || company.isLoading}>
          {saveCompany.isPending ? "Saving..." : "Save company settings"}
        </Button>
        {mode === "onboarding" ? (
          <Button onClick={() => completeSetup.mutate()} disabled={completeSetup.isPending || company.isLoading}>
            {completeSetup.isPending ? "Completing..." : "Complete setup"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
