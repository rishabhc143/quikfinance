import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewAccountPage() {
  return <FormPage config={getModuleConfig("chart-of-accounts")} />;
}
