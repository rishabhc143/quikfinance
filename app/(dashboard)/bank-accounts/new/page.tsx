import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewBankAccountPage() {
  return <FormPage config={getModuleConfig("bank-accounts")} />;
}
