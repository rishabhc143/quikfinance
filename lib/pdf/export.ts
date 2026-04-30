export type PdfExportColumn = {
  key: string;
  label: string;
  kind?: "text" | "money" | "number" | "status" | "date" | "boolean";
};

export type PdfExportSummaryItem = {
  label: string;
  value: string;
};

export type PdfExportSection = {
  title: string;
  values: PdfExportSummaryItem[];
};

export type PdfExportPayload = {
  title: string;
  subtitle?: string;
  filenameBase?: string;
  columns: PdfExportColumn[];
  rows: Array<Record<string, unknown>>;
  summary?: PdfExportSummaryItem[];
  sections?: PdfExportSection[];
  totals?: PdfExportSummaryItem[];
  orientation?: "portrait" | "landscape";
};
