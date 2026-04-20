"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, LogOut, Moon, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Topbar() {
  const router = useRouter();

  const logout = async () => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      toast.error("Supabase is not configured.");
      return;
    }
    await supabase.auth.signOut();
    toast.success("Signed out.");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileSidebar />
        <div className="hidden md:block">
          <p className="text-sm font-semibold">Acme Operating Co.</p>
          <p className="text-xs text-muted-foreground">Fiscal year 2026 · USD</p>
        </div>
        <div className="relative ml-auto hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices, contacts, accounts" className="pl-9" />
        </div>
        <Button variant="ghost" aria-label="Toggle theme">
          <Moon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary" aria-label="User menu">
              <UserRound className="mr-2 h-4 w-4" />
              Owner
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" className="z-50 min-w-44 rounded-lg border bg-card p-1 shadow-soft">
            <DropdownMenu.Item className="rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">Profile</DropdownMenu.Item>
            <DropdownMenu.Item className="rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">Settings</DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item onClick={logout} className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm outline-none hover:bg-muted">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
