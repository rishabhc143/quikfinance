import { PageHeader } from "@/components/shared/PageHeader";
import { CompanySetupForm } from "@/components/settings/CompanySetupForm";

export default function SettingsCompanyPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Company profile" description="Edit company profile, GST settings, fiscal year, numbering, and onboarding controls." />
      <CompanySetupForm mode="settings" />
    </div>
  );
}
