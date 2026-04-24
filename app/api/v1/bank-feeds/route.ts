import { createCustomCrudHandlers } from "@/lib/api/custom-module-crud";
import { bankFeedsRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudHandlers(bankFeedsRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
