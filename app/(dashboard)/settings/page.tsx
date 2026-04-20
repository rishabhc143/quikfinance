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
    { name: "tax_id", label: "Tax ID", type: "text" },
    { name: "base_currency", label: "Base currency", type: "select", options: [{ label: "USD", value: "USD" }, { label: "INR", value: "INR" }] },
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
