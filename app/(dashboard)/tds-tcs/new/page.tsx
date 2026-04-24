import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewTdsTcsPage() {
  return <FormPage config={getModuleConfig("tds-tcs")} />;
}
