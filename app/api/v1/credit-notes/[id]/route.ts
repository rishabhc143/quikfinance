import { createCrudItemHandlers } from "@/lib/api/crud";
import { creditNoteRouteConfig } from "@/lib/api/module-routes";

export const dynamic = "force-dynamic";
const handlers = createCrudItemHandlers(creditNoteRouteConfig);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
