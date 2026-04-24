import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewBankFeedPage() {
  return <FormPage config={getModuleConfig("bank-feeds")} />;
}
