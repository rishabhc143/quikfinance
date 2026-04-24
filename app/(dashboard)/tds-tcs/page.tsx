import { ModulePage } from "@/components/shared/ModulePage";
import { getModuleConfig } from "@/lib/modules";

export default function TdsTcsPage() {
  return <ModulePage config={getModuleConfig("tds-tcs")} />;
}
