import { createCustomCrudHandlers } from "@/lib/api/custom-module-crud";
import { deliveryDispatchRouteConfig } from "@/lib/api/custom-module-routes";

export const dynamic = "force-dynamic";
const handlers = createCustomCrudHandlers(deliveryDispatchRouteConfig);
export const GET = handlers.GET;
export const POST = handlers.POST;
