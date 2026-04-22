import { createCrudHandlers } from "@/lib/api/crud";
import { vendorCreditRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(vendorCreditRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
