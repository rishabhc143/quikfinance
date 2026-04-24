import { ApprovalsWorkspace } from "@/components/workflows/ApprovalsWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Approvals" description="Live maker-checker queue for approval requests, decisions, and status updates." />
      <ApprovalsWorkspace />
    </div>
  );
}
