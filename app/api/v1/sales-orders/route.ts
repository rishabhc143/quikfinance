import { createCrudHandlers } from "@/lib/api/crud";
import { salesOrderRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(salesOrderRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
