import { PageHeader } from "@/components/shared/PageHeader";
import { SettlementsWorkspace } from "@/components/workflows/SettlementsWorkspace";

export default function SettlementsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Settlements" description="Live settlement workbench for payout status, net tracking, and gateway event visibility." />
      <SettlementsWorkspace />
    </div>
  );
}
