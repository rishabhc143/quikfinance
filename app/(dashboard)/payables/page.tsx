import { PageHeader } from "@/components/shared/PageHeader";
import { PayablesWorkspace } from "@/components/workflows/PayablesWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Payables" description="Live AP workbench for outstanding bills, payout posting, and due-date review." />
      <PayablesWorkspace />
    </div>
  );
}
