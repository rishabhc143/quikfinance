import type { ApiContext } from "@/lib/api/auth";

export async function upsertWorkflowException(context: ApiContext, input: {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string | null;
  entityType: string;
  entityId: string;
}) {
  const { data: existing, error: existingError } = await context.supabase
    .from("workflow_exceptions")
    .select("id, status")
    .eq("org_id", context.orgId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("title", input.title)
    .in("status", ["open", "in_progress"])
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("workflow_exceptions")
      .update({ category: input.category, severity: input.severity, description: input.description ?? null })
      .eq("org_id", context.orgId)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("workflow_exceptions")
    .insert({
      org_id: context.orgId,
      category: input.category,
      severity: input.severity,
      title: input.title,
      description: input.description ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      status: "open"
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Workflow exception could not be created.");
  }

  return String((data as { id: string }).id);
}

export async function resolveWorkflowExceptions(context: ApiContext, input: {
  entityType: string;
  entityId: string;
  resolution: string;
}) {
  const { error } = await context.supabase
    .from("workflow_exceptions")
    .update({ status: "resolved", resolution: input.resolution, resolved_at: new Date().toISOString() })
    .eq("org_id", context.orgId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .in("status", ["open", "in_progress"]);

  if (error) {
    throw new Error(error.message);
  }
}
