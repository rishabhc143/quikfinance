import { createCrudHandlers } from "@/lib/api/crud";
import { billRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(billRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
