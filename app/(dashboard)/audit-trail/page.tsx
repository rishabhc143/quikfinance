import { PageHeader } from "@/components/shared/PageHeader";
import { AuditTrailWorkspace } from "@/components/workflows/AuditTrailWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Audit Trail" description="Live audit log for create, update, and delete events across operational modules." />
      <AuditTrailWorkspace />
    </div>
  );
}
