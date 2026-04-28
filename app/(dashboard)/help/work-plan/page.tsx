import { WorkPlanView } from "@/components/help/WorkPlanView";
import { PageHeader } from "@/components/shared/PageHeader";

export default function WorkPlanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="2-Week Work Plan"
        description="A printable in-app plan for the next 2 weeks of QuikFinance product hardening, workflow depth, reporting polish, and demo readiness."
      />
      <WorkPlanView />
    </div>
  );
}
