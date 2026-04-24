import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function TemplatesPage() {
  return <WorkflowPage config={getWorkflowPage("templates")} />;
}
