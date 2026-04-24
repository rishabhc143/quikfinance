import { PageHeader } from "@/components/shared/PageHeader";
import { DocumentsWorkspace } from "@/components/workflows/DocumentsWorkspace";

export default function Page() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Documents" description="Live document index, OCR review queue, duplicate marking, and archive actions." />
      <DocumentsWorkspace />
    </div>
  );
}
