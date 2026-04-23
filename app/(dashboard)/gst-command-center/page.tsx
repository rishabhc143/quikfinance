import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function Page() {
  return <WorkflowPage config={getWorkflowPage("gst-command-center")} workflowKey="gst-command-center" />;
}

