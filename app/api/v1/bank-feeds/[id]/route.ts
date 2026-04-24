import { createCustomCrudItemHandlers } from "@/lib/api/custom-module-crud";
import { bankFeedsRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudItemHandlers(bankFeedsRouteConfig);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
