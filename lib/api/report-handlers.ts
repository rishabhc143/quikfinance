import type { NextRequest } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { fallbackDashboard } from "@/lib/dashboard-data";
import {
  buildAgingReport,
  buildBalanceSheetReport,
  buildCashFlowReport,
  buildGstParityReport,
  buildGstSummaryReport,
  buildGstr1Report,
  buildGstr3bReport,
  buildOutstandingReport,
  buildProfitLossReport,
  buildTrialBalanceReport
} from "@/lib/report-data";

export function createReportHandler(reportKey: string) {
  return async (request: NextRequest) => {
    const auth = await requireApiContext();
    if (!auth.ok) {
      return fail(auth.status, { code: auth.code, message: auth.message });
    }

    const from = request.nextUrl.searchParams.get("from") ?? "2026-01-01";
    const to = request.nextUrl.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    switch (reportKey) {
      case "profit-loss":
        return ok(await buildProfitLossReport(auth.context, from, to));
      case "balance-sheet":
        return ok(await buildBalanceSheetReport(auth.context, from, to));
      case "cash-flow":
        return ok(await buildCashFlowReport(auth.context, from, to));
      case "trial-balance":
        return ok(await buildTrialBalanceReport(auth.context, from, to));
      case "aging":
        return ok(await buildAgingReport(auth.context, from, to));
      case "gst-summary":
        return ok(await buildGstSummaryReport(auth.context, from, to));
      case "gst-parity":
        return ok(await buildGstParityReport(auth.context, from, to));
      case "gstr-1":
        return ok(await buildGstr1Report(auth.context, from, to));
      case "gstr-3b":
        return ok(await buildGstr3bReport(auth.context, from, to));
      case "outstanding":
        return ok(await buildOutstandingReport(auth.context, from, to));
      default:
        return fail(404, { code: "REPORT_NOT_FOUND", message: "Report handler not found." });
    }
  };
}

export async function dashboardHandler(_request: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  return ok(fallbackDashboard);
}
