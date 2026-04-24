import { PageHeader } from "@/components/shared/PageHeader";
import { CloseManagementWorkspace } from "@/components/workflows/CloseManagementWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Close Management" description="Live month-end checklist, close blockers, and task progression." />
      <CloseManagementWorkspace />
    </div>
  );
}
