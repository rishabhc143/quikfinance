import { createCrudHandlers } from "@/lib/api/crud";
import { journalRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(journalRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
