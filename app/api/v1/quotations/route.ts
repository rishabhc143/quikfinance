import { createCrudHandlers } from "@/lib/api/crud";
import { quotationRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(quotationRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
