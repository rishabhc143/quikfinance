"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { translateModuleMeta, useI18n } from "@/lib/i18n";
import { downloadPdfExport } from "@/lib/pdf/client";
import type { ModuleConfig, TableRow, TableValue } from "@/lib/modules";
import { formatMoney } from "@/lib/utils/currency";

function isTableValue(value: unknown): value is TableValue {
  return ["string", "number", "boolean"].includes(typeof value) || value === null;
}

function normalizeRows(value: unknown, fallback: TableRow[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const rows = value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item, index) => {
      const row: TableRow = { id: typeof item.id === "string" ? item.id : `row-${index}` };
      Object.entries(item).forEach(([key, entry]) => {
        if (isTableValue(entry)) {
          row[key] = entry;
        }
      });
      return row;
    });
  return rows.length > 0 ? rows : fallback;
}

function countStatuses(rows: TableRow[], statuses: string[]) {
  const matchers = statuses.map((status) => status.toLowerCase());
  return rows.filter((row) => typeof row.status === "string" && matchers.includes(row.status.toLowerCase())).length;
}

function detailHref(config: ModuleConfig, row: TableRow) {
  const detailKeys = new Set([
    "customers",
    "vendors",
    "invoices",
    "bills",
    "expenses",
    "inventory",
    "projects",
    "purchase-orders",
    "quotations",
    "sales-orders",
    "credit-notes",
    "vendor-credits",
    "time-tracking",
    "bank-accounts"
  ]);

  if (!detailKeys.has(config.key)) {
    return null;
  }

  const basePath = config.listPath ?? `/${config.key}`;
  return `${basePath}/${row.id}`;
}

function moduleSummary(config: ModuleConfig, rows: TableRow[], total: number) {
  if (config.key === "customers" || config.key === "vendors") {
    return [
      { label: "Active records", value: String(rows.filter((row) => row.is_active !== false).length) },
      { label: config.key === "customers" ? "Receivable exposure" : "Payable exposure", value: formatMoney(total) },
      { label: "Inactive records", value: String(rows.filter((row) => row.is_active === false).length) }
    ];
  }

  if (["invoices", "quotations", "sales-orders", "credit-notes"].includes(config.key)) {
    return [
      { label: "Documents", value: String(rows.length) },
      { label: "Gross value", value: formatMoney(total) },
      { label: "Open / in progress", value: String(countStatuses(rows, ["draft", "sent", "confirmed", "partial", "issued"])) }
    ];
  }

  if (["bills", "purchase-orders", "vendor-credits"].includes(config.key)) {
    return [
      { label: "Documents", value: String(rows.length) },
      { label: "Gross value", value: formatMoney(total) },
      { label: "Open / approved", value: String(countStatuses(rows, ["draft", "submitted", "approved", "partial"])) }
    ];
  }

  if (["payments-received", "payments-made"].includes(config.key)) {
    return [
      { label: "Payments", value: String(rows.length) },
      { label: "Cash moved", value: formatMoney(total) },
      { label: "Posted", value: String(countStatuses(rows, ["posted", "success"])) }
    ];
  }

  if (config.key === "bank-accounts") {
    return [
      { label: "Accounts", value: String(rows.length) },
      { label: "Cash tracked", value: formatMoney(total) },
      { label: "Active", value: String(rows.filter((row) => row.is_active !== false).length) }
    ];
  }

  if (config.key === "inventory") {
    return [
      { label: "Items", value: String(rows.length) },
      { label: "Inventory value", value: formatMoney(total) },
      { label: "Active SKUs", value: String(rows.filter((row) => row.is_active !== false).length) }
    ];
  }

  return [
    { label: "Records", value: String(rows.length) },
    { label: "Tracked value", value: formatMoney(total) },
    { label: "Status tracked", value: String(rows.filter((row) => typeof row.status === "string").length) }
  ];
}

function moduleWorkflowActions(config: ModuleConfig) {
  if (config.key === "customers") {
    return [
      { label: "Receivables", href: "/collections" },
      { label: "Outstanding report", href: "/reports/outstanding" }
    ];
  }
  if (config.key === "vendors") {
    return [
      { label: "Payables", href: "/payables" },
      { label: "Purchase report", href: "/reports/outstanding" }
    ];
  }
  if (config.key === "invoices") {
    return [
      { label: "Collections", href: "/collections" },
      { label: "GST summary", href: "/reports/gst-summary" }
    ];
  }
  if (config.key === "bills") {
    return [
      { label: "Payables", href: "/payables" },
      { label: "GST summary", href: "/reports/gst-summary" }
    ];
  }
  if (config.key === "bank-accounts") {
    return [
      { label: "Reconciliation", href: "/bank-accounts" },
      { label: "Payment ops", href: "/payment-operations" }
    ];
  }
  if (config.key === "inventory") {
    return [
      { label: "Goods receipts", href: "/goods-receipts" },
      { label: "Stock movements", href: "/stock-movements" }
    ];
  }
  return [
    { label: "Import CSV", href: `/imports/new?module=${encodeURIComponent(config.key)}` },
    { label: "Open reports", href: "/reports" }
  ];
}

function emptyStateCopy(config: ModuleConfig, meta: { title: string; entityName: string }) {
  if (config.key === "customers") {
    return {
      title: "No customers yet",
      description: "Add your first customer so quotations, invoices, collections, and portals can connect to a real party."
    };
  }
  if (config.key === "vendors") {
    return {
      title: "No vendors yet",
      description: "Add your first vendor before recording bills, expenses, and supplier payment activity."
    };
  }
  if (config.key === "invoices") {
    return {
      title: "No invoices yet",
      description: "Create a sales invoice to start receivables, GST output, and collection workflows."
    };
  }
  if (config.key === "bills") {
    return {
      title: "No bills yet",
      description: "Create or import a vendor bill to start payables and input GST tracking."
    };
  }
  return {
    title: `No ${meta.title.toLowerCase()} yet`,
    description: `Create your first ${meta.entityName} or import existing records from CSV.`
  };
}

export function ModulePage({ config }: { config: ModuleConfig }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const meta = translateModuleMeta(locale, config.key, {
    title: config.title,
    description: config.description,
    entityName: config.entityName,
    primaryAction: config.primaryAction
  });
  const { data: rows } = useQuery({
    queryKey: ["module", config.key],
    queryFn: async () => {
      const response = await fetch(config.apiPath);
      if (!response.ok) {
        return config.rows;
      }
      const payload = (await response.json()) as { data?: unknown };
      return normalizeRows(payload.data, config.rows);
    },
    initialData: config.rows
  });

  const total = rows.reduce((sum, row) => {
    const amount = row.total ?? row.amount ?? row.rate ?? row.balance ?? row.current_balance ?? row.outstanding ?? 0;
    return sum + (typeof amount === "number" ? amount : 0);
  }, 0);
  const summaryCards = moduleSummary(config, rows, total);
  const workflowActions = moduleWorkflowActions(config);
  const emptyCopy = emptyStateCopy(config, { title: meta.title, entityName: meta.entityName });

  const exportPdf = async () => {
    try {
      await downloadPdfExport({
        title: meta.title,
        subtitle: meta.description,
        filenameBase: meta.title,
        orientation: config.columns.length > 5 ? "landscape" : "portrait",
        columns: config.columns.map((column) => ({
          key: column.key,
          label: column.label,
          kind: column.kind
        })),
        rows,
        summary: summaryCards.map((item) => ({
          label: item.label,
          value: item.value.includes("₹") ? item.value : item.value
        }))
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF export failed.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={meta.title} description={meta.description} actionLabel={meta.primaryAction} actionHref={config.newPath} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{summaryCards[0]?.label ?? t("common.records", "Records")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summaryCards[0]?.value ?? rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{summaryCards[1]?.label ?? t("common.trackedValue", "Tracked value")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{summaryCards[1]?.value ?? formatMoney(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{summaryCards[2]?.label ?? t("common.workflow", "Workflow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{summaryCards[2]?.value ?? "-"}</div>
            <div className="flex flex-wrap gap-2">
              {workflowActions.map((action) => (
                <Button key={action.href} variant="secondary" onClick={() => router.push(action.href)}>
                  {action.label}
                </Button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => void exportPdf()}>
              {t("common.exportPdf", "Export PDF")}
            </Button>
          </CardContent>
        </Card>
      </div>
      {rows.length > 0 ? (
        <DataTable columns={config.columns} rows={rows} title={meta.title} getRowHref={(row) => detailHref(config, row)} />
      ) : (
        <EmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
          actionLabel={meta.primaryAction}
          actionHref={config.newPath}
        />
      )}
    </div>
  );
}
