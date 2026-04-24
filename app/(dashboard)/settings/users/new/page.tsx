import { UserInviteForm } from "@/components/settings/UserInviteForm";
import { PageHeader } from "@/components/shared/PageHeader";

export default function InviteUserPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Invite User" description="Create a new teammate account and assign access before first sign-in." />
      <UserInviteForm />
    </div>
  );
}
