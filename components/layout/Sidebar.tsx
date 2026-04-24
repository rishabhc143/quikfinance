"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigationGroups } from "@/lib/modules";
import { cn } from "@/lib/utils/cn";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const activeGroups = useMemo(
    () =>
      navigationGroups
        .filter((group) => group.items.some((item) => isActivePath(pathname, item.href)))
        .map((group) => group.label),
    [pathname]
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationGroups.map((group) => [group.label, group.items.some((item) => isActivePath(pathname, item.href))]))
  );

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      for (const label of activeGroups) {
        next[label] = true;
      }
      return next;
    });
  }, [activeGroups]);

  return (
    <aside className={cn("h-screen w-72 shrink-0 overflow-y-auto border-r bg-card/95 px-4 py-5", mobile ? "block" : "hidden lg:sticky lg:top-0 lg:block")}>
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">QF</span>
        <span>
          <span className="block text-lg font-bold">QuikFinance</span>
          <span className="block text-xs text-muted-foreground">{t("topbar.companyFallback", "QuikFinance Workspace")}</span>
        </span>
      </Link>
      <nav className="mt-8 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold transition",
                activeGroups.includes(group.label) ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <group.icon className="h-4 w-4" />
                {t(`nav.groups.${group.label}`, group.label)}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openGroups[group.label] ? "rotate-180" : "")} />
            </button>
            {openGroups[group.label] ? (
              <div className="mt-2 space-y-1 border-l pl-3">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${group.label}-${item.title}-${item.href}`}
                      href={item.href}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(`nav.items.${item.title}`, item.title)}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
