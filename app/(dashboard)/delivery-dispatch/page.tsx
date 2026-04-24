import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function DeliveryDispatchPage() {
  return <WorkflowPage config={getWorkflowPage("delivery-dispatch")} />;
}
