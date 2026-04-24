import { PageHeader } from "@/components/shared/PageHeader";
import { CollectionsWorkspace } from "@/components/workflows/CollectionsWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Collections" description="Live receivables workbench for overdue invoices, payment links, and receipt posting." />
      <CollectionsWorkspace />
    </div>
  );
}
