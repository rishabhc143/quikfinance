import { createCustomCrudItemHandlers } from "@/lib/api/custom-module-crud";
import { eInvoicingRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudItemHandlers(eInvoicingRouteConfig);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
