import { PageHeader } from "@/components/shared/PageHeader";
import { GlobalSearchWorkspace } from "@/components/search/GlobalSearchWorkspace";

export default function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Global Search" description="Search live business records, modules, workflows, reports, and settings from one place." />
      <GlobalSearchWorkspace initialQuery={searchParams?.q?.trim() ?? ""} />
    </div>
  );
}
