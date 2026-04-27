import { PageHeader } from "@/components/shared/PageHeader";
import { TransfersWorkspace } from "@/components/workflows/TransfersWorkspace";

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transfers" description="Review treasury account positions and internal transfer controls without relying on a generic workflow shell." />
      <TransfersWorkspace />
    </div>
  );
}
