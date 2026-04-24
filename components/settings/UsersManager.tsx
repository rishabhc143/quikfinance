"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_sign_in_at: string | null;
};

export function UsersManager() {
  const users = useQuery({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const response = await fetch("/api/v1/users", { cache: "no-store" });
      const payload = (await response.json()) as { data?: UserRow[]; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Users could not be loaded.");
      }
      return payload.data ?? [];
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/settings/users/new">Invite user</Link>
        </Button>
      </div>
      {users.isLoading ? <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Loading users...</div> : null}
      {users.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-card p-5 text-sm text-destructive">
          {(users.error as Error).message}
        </div>
      ) : null}
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
            { key: "role", label: "Role", kind: "status" },
            { key: "status", label: "Status", kind: "status" },
            { key: "last_sign_in_at", label: "Last sign in" }
          ]}
        />
      ) : null}
    </div>
  );
}
