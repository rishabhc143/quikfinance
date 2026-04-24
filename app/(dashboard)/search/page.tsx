import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

const quickLinks = [
  { title: "Customers", href: "/customers", description: "Find customer masters, balances, and recent activity." },
  { title: "Invoices", href: "/invoices", description: "Search invoice numbers, statuses, and collections follow-up." },
  { title: "Bills", href: "/bills", description: "Review vendor bills, approvals, and due dates." },
  { title: "Exceptions", href: "/exception-queue", description: "Open operational, GST, and bank exceptions." },
  { title: "Audit Trail", href: "/audit-trail", description: "Trace important changes across workflows." },
  { title: "Reports", href: "/reports", description: "Jump to financial, GST, and cash-flow reporting." }
];

export default function SearchPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Global Search"
        description="Use search as the single jump point for masters, transactions, exceptions, and reports."
      />

      <Card>
        <CardHeader>
          <CardTitle>Search Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search customers, invoices, bills, reports, or workflows" />
          <p className="text-sm text-muted-foreground">
            This page is the navigation entry point for cross-module search. The next step would be wiring it to universal query APIs.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition hover:border-primary/40 hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
