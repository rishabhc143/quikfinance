import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function EWayBillPage() {
  return <WorkflowPage config={getWorkflowPage("e-way-bill")} />;
}
