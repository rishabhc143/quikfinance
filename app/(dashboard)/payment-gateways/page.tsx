import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function PaymentGatewaysPage() {
  return <WorkflowPage config={getWorkflowPage("payment-gateways")} />;
}
