import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function TdsTcsPage() {
  return <WorkflowPage config={getWorkflowPage("tds-tcs")} />;
}
