import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentAttachmentRow } from "@/types/database.types";

const ATTACHMENTS_BUCKET = "attachments";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "document";
}

function buildAttachmentPath(orgId: string, scope: string, entityId: string, fileName: string) {
  return `${orgId}/${scope}/${entityId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

export async function uploadEntityAttachment(input: {
  orgId: string;
  entityType: string;
  entityId: string;
  uploadedBy: string;
  scope: string;
  file: File;
}) {
  const admin = createSupabaseAdminClient();
  const filePath = buildAttachmentPath(input.orgId, input.scope, input.entityId, input.file.name);
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  const uploadResult = await admin.storage.from(ATTACHMENTS_BUCKET).upload(filePath, fileBuffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const { data: attachment, error } = await admin
    .from("document_attachments")
    .insert({
      org_id: input.orgId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      file_name: input.file.name,
      file_path: filePath,
      content_type: input.file.type || "application/octet-stream",
      size_bytes: input.file.size,
      uploaded_by: input.uploadedBy
    })
    .select("*")
    .single();

  if (error || !attachment) {
    throw new Error(error?.message ?? "Attachment metadata could not be stored.");
  }

  return attachment;
}

export async function listEntityAttachments(orgId: string, entityType: string, entityId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_attachments")
    .select("*")
    .eq("org_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentAttachmentRow[];
}

export async function signAttachmentUrls(attachments: DocumentAttachmentRow[]) {
  if (attachments.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const signed = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await admin.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(attachment.file_path, 60 * 60);
      return {
        ...attachment,
        signed_url: data?.signedUrl ?? null
      };
    })
  );

  return signed;
}
