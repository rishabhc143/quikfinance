"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" }
];

export function UserInviteForm(props: {
  embedded?: boolean;
  afterSubmitPath?: string;
  onSubmitted?: () => void | Promise<void>;
} = {}) {
  return <UserInviteFormInternal {...props} />;
}

export function UserInviteFormInternal({
  embedded = false,
  afterSubmitPath = "/settings/users",
  onSubmitted
}: {
  embedded?: boolean;
  afterSubmitPath?: string;
  onSubmitted?: () => void | Promise<void>;
} = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: fullName, role })
    });

    const payload = (await response.json()) as { error?: { message?: string } };
    setSubmitting(false);

    if (!response.ok) {
      toast.error(payload.error?.message ?? "The invitation could not be created.");
      return;
    }

    toast.success("User invitation created.");
    await onSubmitted?.();
    router.push(afterSubmitPath);
  };

  const content = (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div>
        <Label htmlFor="invite-name">Full name</Label>
        <Input id="invite-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {roles.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end justify-end gap-2 md:col-span-2">
        {!embedded ? (
          <Button variant="secondary" type="button" onClick={() => router.push("/settings/users")}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Inviting..." : "Send invite"}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className="rounded-2xl border p-4">
        <p className="font-semibold">Invite teammate</p>
        <p className="mt-1 text-sm text-muted-foreground">Create access for a teammate and assign the initial role.</p>
        <div className="mt-4">{content}</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite user</CardTitle>
        <CardDescription>Create access for a teammate and assign the initial role.</CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
