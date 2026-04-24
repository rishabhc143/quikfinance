import { createCustomCrudHandlers } from "@/lib/api/custom-module-crud";
import { eInvoicingRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudHandlers(eInvoicingRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
