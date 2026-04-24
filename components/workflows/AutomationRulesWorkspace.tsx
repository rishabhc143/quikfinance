"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AutomationRuleRecord = {
  id: string;
  name: string;
  trigger_type: string;
  conditions: Record<string, unknown> | null;
  actions: Array<Record<string, unknown>> | null;
  is_active: boolean;
  created_at: string;
};

type WorkflowResponse = {
  records: AutomationRuleRecord[];
  total: number;
};

type WorkspaceVariant = "rules" | "invoice" | "bill";

type WorkspaceConfig = {
  title: string;
  createTitle: string;
  emptyState: string;
  searchPlaceholder: string;
  primaryLabel: string;
  entityLabel: string;
  actionType: string;
  defaultTrigger: string;
  linkHref: string;
  linkLabel: string;
  triggerOptions: Array<{ value: string; label: string }>;
  cadenceOptions?: Array<{ value: string; label: string }>;
};

const workspaceConfigs: Record<WorkspaceVariant, WorkspaceConfig> = {
  rules: {
    title: "Rules Engine",
    createTitle: "Create automation rule",
    emptyState: "No automation rules found.",
    searchPlaceholder: "Search rules",
    primaryLabel: "Rule",
    entityLabel: "Scope",
    actionType: "create_exception",
    defaultTrigger: "invoice_overdue",
    linkHref: "/automation",
    linkLabel: "Open Automation",
    triggerOptions: [
      { value: "invoice_overdue", label: "Invoice overdue" },
      { value: "bill_due", label: "Bill due" },
      { value: "bank_reconciliation_gap", label: "Bank reconciliation gap" },
      { value: "gst_mismatch", label: "GST mismatch" },
      { value: "manual_review", label: "Manual review" }
    ]
  },
  invoice: {
    title: "Recurring Invoices",
    createTitle: "Create recurring invoice schedule",
    emptyState: "No recurring invoice schedules found.",
    searchPlaceholder: "Search invoice schedules",
    primaryLabel: "Schedule",
    entityLabel: "Customer",
    actionType: "create_invoice_draft",
    defaultTrigger: "recurring_invoice_monthly",
    linkHref: "/invoices",
    linkLabel: "Open Invoices",
    triggerOptions: [
      { value: "recurring_invoice_monthly", label: "Monthly" },
      { value: "recurring_invoice_quarterly", label: "Quarterly" },
      { value: "recurring_invoice_yearly", label: "Yearly" }
    ],
    cadenceOptions: [
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "yearly", label: "Yearly" }
    ]
  },
  bill: {
    title: "Recurring Bills",
    createTitle: "Create recurring bill schedule",
    emptyState: "No recurring bill schedules found.",
    searchPlaceholder: "Search bill schedules",
    primaryLabel: "Schedule",
    entityLabel: "Vendor",
    actionType: "create_bill_draft",
    defaultTrigger: "recurring_bill_monthly",
    linkHref: "/bills",
    linkLabel: "Open Bills",
    triggerOptions: [
      { value: "recurring_bill_monthly", label: "Monthly" },
      { value: "recurring_bill_quarterly", label: "Quarterly" },
      { value: "recurring_bill_yearly", label: "Yearly" }
    ],
    cadenceOptions: [
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
      { value: "yearly", label: "Yearly" }
    ]
  }
};

function triggerTone(triggerType: string) {
  if (triggerType.includes("gst") || triggerType.includes("reconciliation")) return "warning" as const;
  if (triggerType.includes("invoice")) return "info" as const;
  if (triggerType.includes("bill")) return "muted" as const;
  return "default" as const;
}

function statusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("muted" as const);
}

function extractText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function extractDate(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildCreatePayload(variant: WorkspaceVariant, input: { name: string; entityName: string; triggerType: string; cadence: string; nextRunOn: string; notes: string; isActive: boolean }) {
  const normalizedNotes = input.notes.trim();

  if (variant === "rules") {
    return {
      name: input.name,
      trigger_type: input.triggerType,
      conditions: {
        summary: normalizedNotes || "Operational automation rule",
        scope: input.entityName,
        source: "rules_engine_workspace"
      },
      actions: [{ type: workspaceConfigs.rules.actionType }],
      is_active: input.isActive
    };
  }

  const baseConditions = {
    cadence: input.cadence,
    next_run_on: input.nextRunOn,
    notes: normalizedNotes,
    review_before_post: true,
    source: variant === "invoice" ? "recurring_invoice_workspace" : "recurring_bill_workspace"
  };

  if (variant === "invoice") {
    return {
      name: input.name,
      trigger_type: input.triggerType,
      conditions: { ...baseConditions, customer_name: input.entityName },
      actions: [{ type: workspaceConfigs.invoice.actionType }],
      is_active: input.isActive
    };
  }

  return {
    name: input.name,
    trigger_type: input.triggerType,
    conditions: { ...baseConditions, vendor_name: input.entityName },
    actions: [{ type: workspaceConfigs.bill.actionType }],
    is_active: input.isActive
  };
}

function matchesVariant(record: AutomationRuleRecord, variant: WorkspaceVariant) {
  if (variant === "rules") return !record.trigger_type.startsWith("recurring_");
  if (variant === "invoice") return record.trigger_type.startsWith("recurring_invoice_");
  return record.trigger_type.startsWith("recurring_bill_");
}

export function AutomationRulesWorkspace({ variant }: { variant: WorkspaceVariant }) {
  const config = workspaceConfigs[variant];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [triggerType, setTriggerType] = useState(config.defaultTrigger);
  const [cadence, setCadence] = useState(config.cadenceOptions?.[0]?.value ?? "monthly");
  const [nextRunOn, setNextRunOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const rules = useQuery({
    queryKey: ["automation-rules", variant, search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/rules-engine${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Rules could not be loaded.");
      }
      return payload.data;
    }
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/rules-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCreatePayload(variant, { name, entityName, triggerType, cadence, nextRunOn, notes, isActive }))
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Rule could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success(`${config.primaryLabel} created.`);
      setName("");
      setEntityName("");
      setNotes("");
      setTriggerType(config.defaultTrigger);
      setCadence(config.cadenceOptions?.[0]?.value ?? "monthly");
      setNextRunOn(new Date().toISOString().slice(0, 10));
      setIsActive(true);
      await queryClient.invalidateQueries({ queryKey: ["automation-rules", variant] });
      await queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Rule could not be created.");
    }
  });

  const patchRule = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const response = await fetch(`/api/v1/workflows/rules-engine/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Rule update failed.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation-rules", variant] });
      await queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Rule update failed.");
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/workflows/rules-engine/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Rule deletion failed.");
      }
    },
    onSuccess: async () => {
      toast.success(`${config.primaryLabel} removed.`);
      await queryClient.invalidateQueries({ queryKey: ["automation-rules", variant] });
      await queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Rule deletion failed.");
    }
  });

  const records = useMemo(() => (rules.data?.records ?? []).filter((record) => matchesVariant(record, variant)), [rules.data?.records, variant]);
  const activeCount = useMemo(() => records.filter((record) => record.is_active).length, [records]);
  const pausedCount = useMemo(() => records.filter((record) => !record.is_active).length, [records]);
  const nextRunLabel = useMemo(() => {
    const dates = records
      .map((record) => extractDate(record.conditions?.next_run_on))
      .filter((value): value is string => Boolean(value))
      .sort();
    return dates[0] ? formatDate(dates[0]) : "-";
  }, [records]);
  const reviewCount = useMemo(() => records.filter((record) => record.conditions?.review_before_post === true).length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{records.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Paused</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{pausedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{variant === "rules" ? "Review rules" : "Next run"}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{variant === "rules" ? reviewCount : nextRunLabel}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{config.createTitle}</CardTitle>
          <Button asChild variant="secondary">
            <Link href={config.linkHref}>{config.linkLabel}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={`${variant}-name`}>{config.primaryLabel} name</Label>
              <Input id={`${variant}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder={variant === "rules" ? "Overdue invoice reminder" : `Monthly ${config.entityLabel.toLowerCase()} schedule`} />
            </div>
            <div>
              <Label htmlFor={`${variant}-trigger`}>{variant === "rules" ? "Trigger" : "Cadence"}</Label>
              <select id={`${variant}-trigger`} value={triggerType} onChange={(event) => {
                setTriggerType(event.target.value);
                if (variant !== "rules") {
                  const nextCadence = event.target.value.split("_").at(-1) ?? "monthly";
                  setCadence(nextCadence);
                }
              }} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                {config.triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {variant === "rules" ? (
              <div>
                <Label htmlFor={`${variant}-scope`}>{config.entityLabel}</Label>
                <Input id={`${variant}-scope`} value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder="Invoices / Banking / GST" />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor={`${variant}-entity`}>{config.entityLabel}</Label>
                  <Input id={`${variant}-entity`} value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder={variant === "invoice" ? "Customer name" : "Vendor name"} />
                </div>
                <div>
                  <Label htmlFor={`${variant}-next-run`}>Next run date</Label>
                  <Input id={`${variant}-next-run`} type="date" value={nextRunOn} onChange={(event) => setNextRunOn(event.target.value)} />
                </div>
              </>
            )}
            {variant !== "rules" ? (
              <div>
                <Label htmlFor={`${variant}-cadence-readonly`}>Cadence</Label>
                <select id={`${variant}-cadence-readonly`} value={cadence} onChange={(event) => setCadence(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {config.cadenceOptions?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor={`${variant}-status`}>Status</Label>
              <select id={`${variant}-status`} value={isActive ? "active" : "paused"} onChange={(event) => setIsActive(event.target.value === "active")} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor={`${variant}-notes`}>{variant === "rules" ? "Rule notes" : "Schedule notes"}</Label>
              <Textarea id={`${variant}-notes`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={variant === "rules" ? "Escalate overdue invoices after 7 days." : "Generate draft and keep review-before-post enabled."} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => createRule.mutate()} disabled={!name.trim() || createRule.isPending}>
                {createRule.isPending ? "Saving..." : `Create ${config.primaryLabel.toLowerCase()}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{config.title}</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={config.searchPlaceholder} className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading records...</div> : null}
          {rules.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(rules.error as Error).message}</div> : null}
          {!rules.isLoading && !rules.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{config.emptyState}</div> : null}
          {records.map((record) => {
            const summary = extractText(record.conditions?.summary ?? record.conditions?.notes, variant === "rules" ? "No rule notes." : "No schedule notes.");
            const entity = extractText(record.conditions?.customer_name ?? record.conditions?.vendor_name ?? record.conditions?.scope, "-");
            const nextRun = formatDate(extractDate(record.conditions?.next_run_on));
            const actionType = extractText(record.actions?.[0]?.type, "custom_action");

            return (
              <div key={record.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.name}</p>
                      <Badge tone={triggerTone(record.trigger_type)}>{record.trigger_type.replaceAll("_", " ")}</Badge>
                      <Badge tone={statusTone(record.is_active)}>{record.is_active ? "active" : "paused"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{summary}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>Action: {actionType.replaceAll("_", " ")}</span>
                      <span>{config.entityLabel}: {entity}</span>
                      {variant === "rules" ? null : <span>Next run: {nextRun}</span>}
                      <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => patchRule.mutate({ id: record.id, patch: { is_active: !record.is_active } })}>
                      {record.is_active ? "Pause" : "Activate"}
                    </Button>
                    {variant !== "rules" ? (
                      <Button
                        variant="ghost"
                        onClick={() => patchRule.mutate({
                          id: record.id,
                          patch: {
                            conditions: {
                              ...(record.conditions ?? {}),
                              last_run_requested_at: new Date().toISOString(),
                              next_run_on: new Date().toISOString().slice(0, 10)
                            }
                          }
                        })}
                      >
                        Run now
                      </Button>
                    ) : null}
                    <Button variant="destructive" onClick={() => deleteRule.mutate(record.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
