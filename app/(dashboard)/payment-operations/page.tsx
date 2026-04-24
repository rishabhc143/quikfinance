import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentOperationsWorkspace } from "@/components/workflows/PaymentOperationsWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Payment Operations" description="Live settlement tracking, fee/tax visibility, and operational settlement status changes." />
      <PaymentOperationsWorkspace />
    </div>
  );
}
