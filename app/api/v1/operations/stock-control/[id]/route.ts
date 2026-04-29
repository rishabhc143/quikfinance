import { canManageFinance, requireApiContext, type ApiContext } from "@/lib/api/auth";
import { postStockMovementCancellationJournal, postStockMovementJournal } from "@/lib/accounting/transactions";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { getInventoryItem, setInventoryQuantity, syncLowStockException } from "@/lib/inventory/stock-control-server";
import { movementDelta, type StockMovementInput } from "@/lib/inventory/stock-control";

export const dynamic = "force-dynamic";

const movementSelect = `
  id,
  item_id,
  warehouse_id,
  movement_type,
  quantity,
  unit_cost,
  source_type,
  source_id,
  status,
  reason,
  created_at,
  item:items(id, sku, name, quantity_on_hand, reorder_point),
  warehouse:warehouses(id, code, name)
`;

async function loadMovement(context: ApiContext, movementId: string) {
  const { data, error } = await context.supabase
    .from("stock_movements")
    .select(movementSelect)
    .eq("org_id", context.orgId)
    .eq("id", movementId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Stock movement could not be loaded.");
  }

  return data;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "FINANCE_ROLE_REQUIRED", message: "Only finance roles can manage stock controls." });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const movement = await loadMovement(auth.context, params.id);
    const nextStatus = body.status === "posted" || body.status === "cancelled" || body.status === "draft" ? body.status : movement.status;
    const patch: Record<string, unknown> = {};
    let journalEntryId: string | null = null;

    if (typeof body.reason === "string") {
      patch.reason = body.reason || null;
    }

    if (nextStatus !== movement.status) {
      if (movement.status === "posted" && nextStatus === "draft") {
        return fail(422, { code: "INVALID_STATUS_TRANSITION", message: "Posted stock movements cannot move back to draft." });
      }

      if (!movement.item_id) {
        return fail(422, { code: "ITEM_REQUIRED", message: "This stock movement is missing its inventory item." });
      }

      const item = await getInventoryItem(auth.context, String(movement.item_id));
      let nextQuantity = Number(item.quantity_on_hand ?? 0);

      if (movement.status === "draft" && nextStatus === "posted") {
        const applied = movementDelta(movement.movement_type as StockMovementInput["movement_type"], Number(movement.quantity ?? 0));
        nextQuantity += applied;
      }

      if (movement.status === "posted" && nextStatus === "cancelled") {
        const reversal = -movementDelta(movement.movement_type as StockMovementInput["movement_type"], Number(movement.quantity ?? 0));
        nextQuantity += reversal;
      }

      if (nextQuantity < 0) {
        return fail(422, { code: "NEGATIVE_STOCK_BLOCKED", message: `Cancelling or posting this movement would drive ${item.name ?? item.sku ?? "the item"} below zero stock.` });
      }

      if (movement.status !== nextStatus && (nextStatus === "posted" || nextStatus === "cancelled")) {
        const updatedItem = await setInventoryQuantity(auth.context, item.id, nextQuantity);
        await syncLowStockException(auth.context, updatedItem);

        if (nextStatus === "posted") {
          journalEntryId = await postStockMovementJournal(auth.context, {
            movementId: params.id,
            movementType: movement.movement_type as StockMovementInput["movement_type"],
            quantity: Number(movement.quantity ?? 0),
            unitCost: Number(movement.unit_cost ?? 0),
            itemLabel: item.name ?? item.sku ?? "inventory item",
            entryDate: new Date().toISOString().slice(0, 10),
            reason: typeof patch.reason === "string" ? patch.reason : movement.reason
          });
        }

        if (nextStatus === "cancelled") {
          journalEntryId = await postStockMovementCancellationJournal(auth.context, {
            movementId: params.id,
            movementType: movement.movement_type as StockMovementInput["movement_type"],
            quantity: Number(movement.quantity ?? 0),
            unitCost: Number(movement.unit_cost ?? 0),
            itemLabel: item.name ?? item.sku ?? "inventory item",
            entryDate: new Date().toISOString().slice(0, 10),
            reason: typeof patch.reason === "string" ? patch.reason : movement.reason
          });
        }

      }

      patch.status = nextStatus;
    }

    if (Object.keys(patch).length === 0) {
      return ok(movement);
    }

    const { error } = await auth.context.supabase
      .from("stock_movements")
      .update(patch)
      .eq("org_id", auth.context.orgId)
      .eq("id", params.id);

    if (error) {
      return fail(400, { code: "STOCK_CONTROL_UPDATE_FAILED", message: error.message });
    }

    const record = await loadMovement(auth.context, params.id);

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: "status_update",
      entity_type: "stock_movement",
      entity_id: params.id,
      new_values: {
        ...patch,
        journal_entry_id: journalEntryId
      }
    });

    return ok(record);
  } catch (error) {
    return fail(500, { code: "STOCK_CONTROL_UPDATE_FAILED", message: errorMessage(error) });
  }
}

