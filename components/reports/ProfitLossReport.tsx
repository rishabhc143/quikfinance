import { ReportPage } from "@/components/shared/ReportPage";
import { getReportConfig } from "@/lib/reports";

export function ProfitLossReport() {
  return <ReportPage config={getReportConfig("profit-loss")} />;
}
