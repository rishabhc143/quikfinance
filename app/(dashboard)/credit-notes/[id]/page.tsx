import { DetailPage } from "@/components/shared/DetailPage";
import { getModuleConfig } from "@/lib/modules";

export default function CreditNoteDetailPage({ params }: { params: { id: string } }) {
  return <DetailPage config={getModuleConfig("credit-notes")} id={params.id} />;
}
