import { PageHeader } from "@/components/shared/PageHeader";
import { StockMovementsWorkspace } from "@/components/workflows/StockMovementsWorkspace";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" description="Track receipts, issues, transfers, adjustments, and dispatch postings with operational controls." />
      <StockMovementsWorkspace />
    </div>
  );
}

