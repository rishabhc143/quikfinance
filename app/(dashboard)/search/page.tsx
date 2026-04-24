import Link from "next/link";
import { navigationGroups, moduleConfigs } from "@/lib/modules";
import { workflowPages } from "@/lib/workflow-pages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

type SearchEntry = {
  title: string;
  href: string;
  description: string;
  category: string;
};

function buildEntries(): SearchEntry[] {
  const navEntries = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({
      title: item.title,
      href: item.href,
      description: `Open ${item.title} in ${group.label}.`,
      category: group.label
    }))
  );

  const moduleEntries = Object.values(moduleConfigs).map((module) => ({
    title: module.title,
    href: module.newPath ?? `/${module.key}`,
    description: module.description,
    category: "Modules"
  }));

  const workflowEntries = Object.entries(workflowPages).map(([key, workflow]) => ({
    title: workflow.title,
    href: `/${key}`,
    description: workflow.description,
    category: "Workflows"
  }));

  return [...navEntries, ...moduleEntries, ...workflowEntries].filter(
    (entry, index, list) => list.findIndex((candidate) => candidate.title === entry.title && candidate.href === entry.href) === index
  );
}

export default function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  const query = searchParams?.q?.trim() ?? "";
  const entries = buildEntries();
  const results = query
    ? entries.filter((entry) => `${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 24)
    : entries.slice(0, 12);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Global Search" description="Search modules, workflows, reports, settings, and operations from one place." />

      <Card>
        <CardHeader>
          <CardTitle>Search Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" action="/search">
            <Input name="q" defaultValue={query} placeholder="Search customers, invoices, bills, reports, or workflows" />
          </form>
          <p className="text-sm text-muted-foreground">
            {query ? `Showing ${results.length} result${results.length === 1 ? "" : "s"} for "${query}".` : "Try customer names, invoices, GST, banking, or workflow keywords."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((link) => (
          <Link key={`${link.category}-${link.href}-${link.title}`} href={link.href}>
            <Card className="h-full transition hover:border-primary/40 hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{link.description}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{link.category}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
