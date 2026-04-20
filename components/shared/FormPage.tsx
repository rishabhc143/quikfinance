import { RecordForm } from "@/components/forms/RecordForm";
import { PageHeader } from "@/components/shared/PageHeader";
import type { ModuleConfig } from "@/lib/modules";

export function FormPage({ config }: { config: ModuleConfig }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={`New ${config.entityName}`} description={config.description} />
      <RecordForm config={config} />
    </div>
  );
}
