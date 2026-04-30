"use client";

import type { PdfExportPayload } from "@/lib/pdf/export";

function readFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? `${fallback}.pdf`;
}

export async function downloadPdfExport(payload: PdfExportPayload, endpoint = "/api/v1/exports/pdf") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message ?? "PDF export failed.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = readFileName(response, payload.filenameBase ?? "export");
  link.click();
  URL.revokeObjectURL(url);
}
