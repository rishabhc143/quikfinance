import { WorkflowPage } from "@/components/shared/WorkflowPage";
import { getWorkflowPage } from "@/lib/workflow-pages";

export default function BankFeedsPage() {
  return <WorkflowPage config={getWorkflowPage("bank-feeds")} />;
}
