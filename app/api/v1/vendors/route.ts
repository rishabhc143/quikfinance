import { createCrudHandlers } from "@/lib/api/crud";
import { vendorRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(vendorRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
