"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DocumentRecord = {
  id: string;
  document_type: string;
  file_name: string;
  status: "indexed" | "ocr_review" | "duplicate" | "archived";
  confidence_score: number | null;
  entity_type: string | null;
  created_at: string;
};

type WorkflowResponse = {
  records: DocumentRecord[];
  total: number;
};

function statusTone(status: string) {
  if (status === "indexed") return "success" as const;
  if (status === "duplicate") return "danger" as const;
  if (status === "archived") return "muted" as const;
  return "warning" as const;
}

export function DocumentsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState("attachment");
  const [entityType, setEntityType] = useState("");
  const [confidenceScore, setConfidenceScore] = useState("85");

  const documents = useQuery({
    queryKey: ["documents-workspace", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/workflows/documents${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkflowResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Documents could not be loaded.");
      }
      return payload.data;
    }
  });

  const createDocument = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/workflows/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: fileName,
          document_type: documentType,
          entity_type: entityType || null,
          status: "indexed",
          confidence_score: Number(confidenceScore || 0)
        })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Document could not be created.");
      }
    },
    onSuccess: async () => {
      toast.success("Document created.");
      setFileName("");
      setDocumentType("attachment");
      setEntityType("");
      setConfidenceScore("85");
      await queryClient.invalidateQueries({ queryKey: ["documents-workspace"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Document could not be created.");
    }
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DocumentRecord["status"] }) => {
      const response = await fetch(`/api/v1/workflows/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Document update failed.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents-workspace"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Document update failed.");
    }
  });

  const records = useMemo(() => documents.data?.records ?? [], [documents.data?.records]);
  const reviewCount = useMemo(() => records.filter((record) => record.status === "ocr_review").length, [records]);
  const duplicateCount = useMemo(() => records.filter((record) => record.status === "duplicate").length, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">OCR review</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{reviewCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Duplicates</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{duplicateCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total indexed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{documents.data?.total ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Index document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="doc-file-name">File name</Label>
              <Input id="doc-file-name" value={fileName} onChange={(event) => setFileName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="doc-type">Document type</Label>
              <Input id="doc-type" value={documentType} onChange={(event) => setDocumentType(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="doc-entity-type">Entity type</Label>
              <Input id="doc-entity-type" value={entityType} onChange={(event) => setEntityType(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="doc-confidence">Confidence</Label>
              <Input id="doc-confidence" type="number" value={confidenceScore} onChange={(event) => setConfidenceScore(event.target.value)} />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <Button onClick={() => createDocument.mutate()} disabled={!fileName.trim() || createDocument.isPending}>
                {createDocument.isPending ? "Creating..." : "Index document"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Document queue</CardTitle>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" className="md:max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.isLoading ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Loading documents...</div> : null}
          {documents.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">{(documents.error as Error).message}</div> : null}
          {!documents.isLoading && !documents.isError && records.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No documents found.</div> : null}
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{record.file_name}</p>
                    <Badge tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Badge>
                    <Badge tone="info">{record.document_type}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{record.entity_type || "-"}</span>
                    <span>Confidence: {record.confidence_score ?? "-"}</span>
                    <span>{new Date(record.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.status !== "ocr_review" ? <Button variant="secondary" onClick={() => updateDocument.mutate({ id: record.id, status: "ocr_review" })}>Send to OCR review</Button> : null}
                  {record.status !== "duplicate" ? <Button variant="ghost" onClick={() => updateDocument.mutate({ id: record.id, status: "duplicate" })}>Mark duplicate</Button> : null}
                  {record.status !== "archived" ? <Button onClick={() => updateDocument.mutate({ id: record.id, status: "archived" })}>Archive</Button> : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
