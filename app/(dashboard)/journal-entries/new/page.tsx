import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewJournalEntryPage() {
  return <FormPage config={getModuleConfig("journal-entries")} />;
}
