import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";

const rows = [
  { id: "match-1", statement_date: "2026-04-20", description: "Northstar ACH", statement_amount: 4000, book_amount: 4000, status: "matched" },
  { id: "match-2", statement_date: "2026-04-19", description: "Metro Cloud Hosting", statement_amount: -1180, book_amount: -1180, status: "matched" },
  { id: "match-3", statement_date: "2026-04-18", description: "Unmatched bank fee", statement_amount: -35, book_amount: 0, status: "review" }
];

export default function ReconciliationPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Bank reconciliation" description={`Match statement transactions for bank account ${params.id}.`} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Statement balance</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">$88,420.00</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Book balance</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">$88,385.00</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Difference</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between text-2xl font-bold text-amber-600">$35.00 <Button>Post fee</Button></CardContent>
        </Card>
      </div>
      <DataTable
        title="Reconciliation"
        rows={rows}
        columns={[
          { key: "statement_date", label: "Date", kind: "date" },
          { key: "description", label: "Description" },
          { key: "statement_amount", label: "Statement", kind: "money", align: "right" },
          { key: "book_amount", label: "Books", kind: "money", align: "right" },
          { key: "status", label: "Status", kind: "status" }
        ]}
      />
    </div>
  );
}
