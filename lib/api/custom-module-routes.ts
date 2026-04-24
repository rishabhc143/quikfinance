import type { ApiContext } from "@/lib/api/auth";
import type { CustomCrudConfig } from "@/lib/api/custom-module-crud";
import { bankFeedSchema, deliveryDispatchSchema, eInvoicingSchema, tdsTcsSchema } from "@/lib/validations/deep-ops.schema";

function sequenceNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function prepareBankFeed(body: Record<string, unknown>, context: ApiContext) {
  return {
    ...body,
    created_by: typeof body.created_by === "string" ? body.created_by : context.userId
  };
}

function prepareDeliveryDispatch(body: Record<string, unknown>, context: ApiContext) {
  return {
    ...body,
    dispatch_number:
      typeof body.dispatch_number === "string" && body.dispatch_number.length > 0 ? body.dispatch_number : sequenceNumber("DSP"),
    created_by: typeof body.created_by === "string" ? body.created_by : context.userId
  };
}

function prepareEInvoicing(body: Record<string, unknown>, context: ApiContext) {
  return {
    ...body,
    submission_number:
      typeof body.submission_number === "string" && body.submission_number.length > 0 ? body.submission_number : sequenceNumber("EINV"),
    created_by: typeof body.created_by === "string" ? body.created_by : context.userId
  };
}

function prepareTdsTcs(body: Record<string, unknown>, context: ApiContext) {
  return {
    ...body,
    created_by: typeof body.created_by === "string" ? body.created_by : context.userId
  };
}

export const bankFeedsRouteConfig: CustomCrudConfig = {
  table: "bank_feeds",
  schema: bankFeedSchema,
  entity: "bank_feed",
  searchColumn: "feed_name",
  orderColumn: "imported_on",
  lockDateField: "imported_on",
  lockScope: "banking",
  prepareCreate: prepareBankFeed,
  prepareUpdate: prepareBankFeed
};

export const deliveryDispatchRouteConfig: CustomCrudConfig = {
  table: "delivery_dispatches",
  schema: deliveryDispatchSchema,
  entity: "delivery_dispatch",
  searchColumn: "dispatch_number",
  orderColumn: "dispatch_date",
  lockDateField: "dispatch_date",
  lockScope: "sales",
  prepareCreate: prepareDeliveryDispatch,
  prepareUpdate: prepareDeliveryDispatch
};

export const eInvoicingRouteConfig: CustomCrudConfig = {
  table: "e_invoice_submissions",
  schema: eInvoicingSchema,
  entity: "e_invoice_submission",
  searchColumn: "invoice_number",
  orderColumn: "submission_date",
  lockDateField: "submission_date",
  lockScope: "sales",
  prepareCreate: prepareEInvoicing,
  prepareUpdate: prepareEInvoicing
};

export const tdsTcsRouteConfig: CustomCrudConfig = {
  table: "tds_tcs_records",
  schema: tdsTcsSchema,
  entity: "tds_tcs_record",
  searchColumn: "section_code",
  orderColumn: "assessment_date",
  lockDateField: "assessment_date",
  lockScope: "all",
  prepareCreate: prepareTdsTcs,
  prepareUpdate: prepareTdsTcs
};
