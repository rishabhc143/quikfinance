import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function TransfersPage() {
  return <WorkflowPage config={getWorkflowPage("transfers")} />;
}
