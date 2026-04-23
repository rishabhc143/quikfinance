import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function Page() {
  return <WorkflowPage config={getWorkflowPage("exception-queue")} workflowKey="exception-queue" />;
}

