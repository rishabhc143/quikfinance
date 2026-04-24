import { FormPage } from "@/components/shared/FormPage";
import { getModuleConfig } from "@/lib/modules";

export default function NewProjectPage() {
  return <FormPage config={getModuleConfig("projects")} />;
}
