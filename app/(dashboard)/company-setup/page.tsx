import { PageHeader } from "@/components/shared/PageHeader";
import { CompanySetupForm } from "@/components/settings/CompanySetupForm";

export default function CompanySetupPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Company setup" description="Complete company profile, fiscal settings, GST setup, and chart of accounts before using the workspace." />
      <CompanySetupForm mode="onboarding" />
    </div>
  );
}
