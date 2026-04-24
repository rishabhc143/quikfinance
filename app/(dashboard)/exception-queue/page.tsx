import { ExceptionsWorkspace } from "@/components/workflows/ExceptionsWorkspace";
import { PageHeader } from "@/components/shared/PageHeader";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Exception Queue" description="Live operational exception queue with status updates and issue logging." />
      <ExceptionsWorkspace />
    </div>
  );
}
