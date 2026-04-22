import { INDIAN_STATE_OPTIONS } from "@/lib/india";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordForm } from "@/components/forms/RecordForm";
import { PageHeader } from "@/components/shared/PageHeader";
import type { ModuleConfig } from "@/lib/modules";

const companyConfig: ModuleConfig = {
  key: "company-settings",
  title: "Company",
  entityName: "company profile",
  description: "Company identity, fiscal year, logo, address, timezone, and numbering defaults.",
  apiPath: "/api/v1/settings/company",
  columns: [],
  rows: [],
  formFields: [
    { name: "name", label: "Company name", type: "text", required: true },
    { name: "legal_name", label: "Legal name", type: "text" },
    { name: "gstin", label: "GSTIN", type: "text" },
    { name: "pan", label: "PAN", type: "text" },
    { name: "state_code", label: "State code", type: "select", options: INDIAN_STATE_OPTIONS.map((state) => ({ label: `${state.value} · ${state.label}`, value: state.value })) },
    { name: "default_upi_id", label: "UPI ID", type: "text" },
    { name: "base_currency", label: "Base currency", type: "select", options: [{ label: "INR", value: "INR" }, { label: "USD", value: "USD" }] },
    { name: "fiscal_year_start", label: "Fiscal start month", type: "select", options: [{ label: "April", value: "4" }, { label: "January", value: "1" }, { label: "July", value: "7" }] },
    { name: "preferred_language", label: "Language", type: "select", options: [{ label: "English", value: "en" }, { label: "Hindi", value: "hi" }] },
    { name: "timezone", label: "Timezone", type: "text" }
  ]
};

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Company settings" description={companyConfig.description} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordForm config={companyConfig} />
        </CardContent>
      </Card>
    </div>
  );
}
