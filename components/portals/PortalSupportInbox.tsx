"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Json } from "@/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";

type SupportTicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
  follow_up: Json;
  created_at: string;
};

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function PortalSupportInbox() {
  const tickets = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/v1/support-tickets");
      const payload = (await response.json()) as { data?: SupportTicketRow[] };
      return payload.data ?? [];
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support Inbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(tickets.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Support tickets created from the customer portal will appear here.
          </div>
        ) : (
          (tickets.data ?? []).map((ticket) => {
            const followUp = asRecord(ticket.follow_up);
            const email = asRecord(followUp?.email as Json);
            const whatsapp = asRecord(followUp?.whatsapp as Json);
            const whatsappUrl = typeof whatsapp?.url === "string" ? whatsapp.url : null;

            return (
              <div key={ticket.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{ticket.ticket_number}</p>
                      <StatusBadge status={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.requested_by_name ?? ticket.requested_by_email ?? "-"} · {new Date(ticket.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="min-w-[240px] rounded-xl bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Follow-up</p>
                    <p className="mt-1 text-muted-foreground">
                      Status: {typeof followUp?.status === "string" ? followUp.status : "pending"}
                    </p>
                    <p className="text-muted-foreground">
                      Email: {typeof email?.status === "string" ? email.status : "skipped"}
                    </p>
                    <p className="text-muted-foreground">
                      WhatsApp: {typeof whatsapp?.status === "string" ? whatsapp.status : "skipped"}
                    </p>
                    {whatsappUrl ? (
                      <Link href={whatsappUrl} target="_blank" className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
                        Open WhatsApp Follow-up
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
