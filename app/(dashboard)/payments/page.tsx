import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentsHubPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Payments" description="Choose whether to record customer collections or vendor payouts." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payments received</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Record customer receipts, invoice collections, and Razorpay settlements.</p>
            <Button asChild><Link href="/payments/received">Open payments received</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payments made</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Record vendor payments, bank transfers, and outgoing settlements.</p>
            <Button asChild variant="secondary"><Link href="/payments/made">Open payments made</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
