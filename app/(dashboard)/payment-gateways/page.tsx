import { PageHeader } from "@/components/shared/PageHeader";
import { PaymentGatewaysWorkspace } from "@/components/workflows/PaymentGatewaysWorkspace";

export default function PaymentGatewaysPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Payment Gateways" description="Live gateway health, webhook activity, payment-link visibility, and settlement readiness." />
      <PaymentGatewaysWorkspace />
    </div>
  );
}
