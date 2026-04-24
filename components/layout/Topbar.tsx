"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Bell, Globe2, LogOut, Moon, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Topbar() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const company = useQuery({
    queryKey: ["company-summary"],
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/company");
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as {
        data?: { name?: string; base_currency?: string; preferred_language?: "en" | "hi" };
      };
      return payload.data ?? null;
    }
  });

  const logout = async () => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      toast.error("Supabase is not configured.");
      return;
    }
    await supabase.auth.signOut();
    toast.success(t("topbar.signedOut", "Signed out."));
    router.push("/login");
  };

  const changeLanguage = async (nextLocale: "en" | "hi") => {
    setLocale(nextLocale);
    await fetch("/api/v1/settings/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_language: nextLocale })
    }).catch(() => null);
  };

  useEffect(() => {
    const enabled = typeof window !== "undefined" && window.localStorage.getItem("qf-theme") === "dark";
    document.documentElement.classList.toggle("dark", enabled);
    setDarkMode(enabled);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("qf-theme", next ? "dark" : "light");
    setDarkMode(next);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileSidebar />
        <div className="hidden md:block">
          <p className="text-sm font-semibold">{company.data?.name ?? t("topbar.companyFallback", "QuikFinance Workspace")}</p>
          <p className="text-xs text-muted-foreground">
            {t("topbar.fiscalYear", "Fiscal year {year} · {currency}", {
              year: new Date().getFullYear(),
              currency: company.data?.base_currency ?? "INR"
            })}
          </p>
        </div>
        <form onSubmit={submitSearch} className="relative ml-auto hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("topbar.placeholder", "Search invoices, contacts, accounts")}
            className="pl-9"
          />
        </form>
        <Button variant="ghost" aria-label="Toggle theme" onClick={toggleTheme}>
          <Moon className="h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" aria-label="Notifications">
          <Link href="/exception-queue">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" aria-label="User menu">
              <UserRound className="mr-2 h-4 w-4" />
              Owner
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="z-50 min-w-44 rounded-lg border bg-card p-1 shadow-soft">
            <DropdownMenu.Item
              onSelect={() => router.push("/settings/users")}
              className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-muted"
            >
              {t("topbar.profile", "Profile")}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => router.push("/settings")}
              className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-muted"
            >
              {t("topbar.settings", "Settings")}
            </DropdownMenu.Item>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className="flex w-full items-center rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">
                <Globe2 className="mr-2 h-4 w-4" />
                {t("common.language", "Language")}
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent className="z-50 min-w-40 rounded-lg border bg-card p-1 shadow-soft">
                  <DropdownMenu.Item onClick={() => changeLanguage("en")} className="rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">
                    {locale === "en" ? "• " : ""}{t("common.english", "English")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => changeLanguage("hi")} className="rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">
                    {locale === "hi" ? "• " : ""}{t("common.hindi", "Hindi")}
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item onClick={logout} className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">
              <LogOut className="mr-2 h-4 w-4" />
              {t("topbar.signOut", "Sign out")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
