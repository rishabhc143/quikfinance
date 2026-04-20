import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { reportConfigs } from "@/lib/reports";

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Reports" description="Financial statements, aging, ledger movement, customer sales, expense categories, and exports." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.values(reportConfigs).map((report) => (
          <Link key={report.key} href={`/reports/${report.key}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-soft">
              <CardHeader>
                <CardTitle>{report.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{report.description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
