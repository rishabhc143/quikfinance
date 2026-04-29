"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SearchGroup = {
  key: string;
  label: string;
  items: SearchItem[];
};

type SearchItem = {
  id: string;
  kind: "record" | "navigation" | "module" | "workflow";
  group: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
};

type SearchPayload = {
  query: string;
  groups: SearchGroup[];
};

const RECENT_KEY = "quikfinance:search:recent";

function readRecentSearches() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  const next = [query.trim(), ...readRecentSearches().filter((value) => value !== query.trim())].slice(0, 8);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function tone(kind: SearchItem["kind"]) {
  if (kind === "record") return "info" as const;
  if (kind === "workflow") return "warning" as const;
  return "muted" as const;
}

export function GlobalSearchWorkspace({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const search = useQuery({
    queryKey: ["workspace-search", query],
    queryFn: async () => {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: SearchPayload; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Search results could not be loaded.");
      }
      return payload.data;
    }
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      writeRecentSearch(trimmed);
      setRecentSearches(readRecentSearches());
    }
  }, [query]);

  const resultCount = useMemo(
    () => (search.data?.groups ?? []).reduce((sum, group) => sum + group.items.length, 0),
    [search.data?.groups]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search customers, invoices, bills, payments, bank accounts, projects, reports, or workflows" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{query.trim().length >= 2 ? `Showing ${resultCount} result${resultCount === 1 ? "" : "s"} for "${query.trim()}".` : "Type at least 2 characters for live business-record search."}</span>
          </div>
          {recentSearches.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setQuery(entry)}
                    className="rounded-full border px-3 py-1 text-sm transition hover:bg-muted"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {search.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Searching...</div> : null}
      {search.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(search.error as Error).message}</div> : null}

      <div className="space-y-4">
        {(search.data?.groups ?? []).map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle className="text-lg">{group.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {group.items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No results in this group.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <Link key={item.id} href={item.href}>
                      <Card className="h-full transition hover:border-primary/40 hover:bg-muted/30">
                        <CardHeader className="flex flex-row items-start justify-between gap-3">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <Badge tone={tone(item.kind)}>{item.kind}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.meta ?? group.label}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
