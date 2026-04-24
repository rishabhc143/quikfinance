import { UsersManager } from "@/components/settings/UsersManager";
import { PageHeader } from "@/components/shared/PageHeader";

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Users" description="Invite teammates, assign roles, and control organization access." />
      <UsersManager />
    </div>
  );
}
