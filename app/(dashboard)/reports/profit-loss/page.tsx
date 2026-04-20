import { ReportPage } from "@/components/shared/ReportPage";
import { getReportConfig } from "@/lib/reports";

export default function ProfitLossPage() {
  return <ReportPage config={getReportConfig("profit-loss")} />;
}
