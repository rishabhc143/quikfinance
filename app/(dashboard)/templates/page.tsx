import { PageHeader } from "@/components/shared/PageHeader";
import { TemplatesWorkspace } from "@/components/workflows/TemplatesWorkspace";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Review branding, numbering, and invoice template choices from a dedicated template control workspace." />
      <TemplatesWorkspace />
    </div>
  );
}
