import { PageHeader } from "@/components/shared/PageHeader";
import { FinanceCopilotWorkspace } from "@/components/workflows/FinanceCopilotWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Finance Copilot" description="Live insight review surface for anomalies, recommendations, and tracked decisions." />
      <FinanceCopilotWorkspace />
    </div>
  );
}
