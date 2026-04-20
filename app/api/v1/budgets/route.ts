import { createCrudHandlers } from "@/lib/api/crud";
import { budgetRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudHandlers(budgetRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
