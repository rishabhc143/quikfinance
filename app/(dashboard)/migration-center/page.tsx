import { PageHeader } from "@/components/shared/PageHeader";
import { MigrationCenterWorkspace } from "@/components/workflows/MigrationCenterWorkspace";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Migration Center" description="Track Tally, Zoho Books, and CSV migration batches with import readiness and validation status." />
      <MigrationCenterWorkspace />
    </div>
  );
}

