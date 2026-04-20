import { createCrudHandlers } from "@/lib/api/crud";
import { invoiceRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(invoiceRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
