import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectProfitabilityDetail } from "@/components/projects/ProjectProfitabilityDetail";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Project" description="Review project profitability, billable time, expenses, and invoice allocation history." />
      <ProjectProfitabilityDetail id={params.id} />
    </div>
  );
}

