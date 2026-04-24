import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function SettlementsPage() {
  return <WorkflowPage config={getWorkflowPage("settlements")} />;
}
