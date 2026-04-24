import { createCustomCrudHandlers } from "@/lib/api/custom-module-crud";
import { tdsTcsRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudHandlers(tdsTcsRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
