"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserInviteForm } from "@/components/settings/UserInviteForm";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_sign_in_at: string | null;
};

export function UsersRolesWorkspace({ initialComposerOpen = false }: { initialComposerOpen?: boolean }) {
  const users = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const response = await fetch("/api/v1/users", { cache: "no-store" });
      const payload = (await response.json()) as { data?: UserRow[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Users could not be loaded.");
      return payload.data ?? [];
    }
  });

  const metrics = useMemo(() => {
    const rows = users.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      pending: rows.filter((row) => row.status === "invited").length,
      admins: rows.filter((row) => ["owner", "admin"].includes(row.role)).length
    };
  }, [users.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Invite teammates, assign access, and review role distribution across the organization." actionLabel="Invite user" actionHref="/settings/users/new" />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Total users</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader><CardTitle>Active</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle>Invited</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.pending}</CardContent></Card>
        <Card><CardHeader><CardTitle>Admins / Owners</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.admins}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Access controls</CardTitle>
          <div className="flex gap-2">
            <Button asChild variant="secondary"><Link href="/settings/users/new">Open full invite page</Link></Button>
            <Button asChild variant="secondary"><Link href="/settings/audit-logs">Audit logs</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4 text-sm">
            <p className="font-semibold">Role policy</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Owner:</span> full access, company and billing control</li>
              <li><span className="font-medium text-foreground">Admin:</span> operational access and team control</li>
              <li><span className="font-medium text-foreground">Accountant:</span> transaction and reporting access</li>
              <li><span className="font-medium text-foreground">Viewer:</span> read-only access</li>
            </ul>
          </div>
          {initialComposerOpen ? <UserInviteForm embedded afterSubmitPath="/settings/users" /> : <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Use the invite action to grant a teammate access and assign their initial role.</div>}
        </CardContent>
      </Card>

      {users.isLoading ? <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Loading users...</div> : null}
      {users.isError ? <div className="rounded-lg border border-destructive/30 bg-card p-5 text-sm text-destructive">{(users.error as Error).message}</div> : null}
      {!users.isLoading && !users.isError ? (
        <DataTable
          title="Users"
          rows={(users.data ?? []).map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            last_sign_in_at: user.last_sign_in_at ?? "-"
          }))}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", kind: "status" as const },
            { key: "status", label: "Status", kind: "status" as const },
            { key: "last_sign_in_at", label: "Last sign in" }
          ]}
        />
      ) : null}
    </div>
  );
}
