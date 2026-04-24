import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function EInvoicingPage() {
  return <WorkflowPage config={getWorkflowPage("e-invoicing")} />;
}
