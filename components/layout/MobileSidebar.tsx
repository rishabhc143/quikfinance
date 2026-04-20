"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";

export function MobileSidebar() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-card">
          <Sidebar mobile />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
