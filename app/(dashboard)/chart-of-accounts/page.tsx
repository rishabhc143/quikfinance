import { ModulePage } from "@/components/shared/ModulePage";
import { getModuleConfig } from "@/lib/modules";

export default function ChartOfAccountsPage() {
  return <ModulePage config={getModuleConfig("chart-of-accounts")} />;
}
