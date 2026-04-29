import { canManageFinance, requireApiContext, type ApiContext } from "@/lib/api/auth";
import { postStockMovementJournal } from "@/lib/accounting/transactions";
import { errorMessage, fail, ok } from "@/lib/api/responses";
import { getInventoryItem, setInventoryQuantity, syncLowStockException } from "@/lib/inventory/stock-control-server";
import { applyStockMovement, validateStockMovement, type StockMovementInput } from "@/lib/inventory/stock-control";

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

async function listLowStockCount(context: ApiContext) {
  const { data, error } = await context.supabase
    .from("items")
    .select("id, quantity_on_hand, reorder_point")
    .eq("org_id", context.orgId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).filter((item: { quantity_on_hand: number | null; reorder_point: number | null }) => Number(item.quantity_on_hand ?? 0) <= Number(item.reorder_point ?? 0)).length;
}

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

export async function GET(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  try {
    const url = new URL(request.url);
    const movementType = url.searchParams.get("movement_type");
    const search = url.searchParams.get("search")?.trim();

    let query = auth.context.supabase
      .from("stock_movements")
      .select(movementSelect)
      .eq("org_id", auth.context.orgId)
      .order("created_at", { ascending: false });

    if (movementType) {
      query = query.eq("movement_type", movementType);
    }

    if (search) {
      query = query.or(`reason.ilike.%${search}%,movement_type.ilike.%${search}%,source_type.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) {
      return fail(400, { code: "STOCK_CONTROL_LIST_FAILED", message: error.message });
    }

    const lowStockItems = await listLowStockCount(auth.context);
    const records = data ?? [];

    return ok({
      records,
      summary: {
        total: records.length,
        draft: records.filter((record) => record.status === "draft").length,
        posted: records.filter((record) => record.status === "posted").length,
        tracked_value: records.reduce((sum, record) => sum + Number(record.quantity ?? 0) * Number(record.unit_cost ?? 0), 0),
        low_stock_items: lowStockItems
      }
    });
  } catch (error) {
    return fail(500, { code: "STOCK_CONTROL_LIST_FAILED", message: errorMessage(error) });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }
  if (!canManageFinance(auth.context.role)) {
    return fail(403, { code: "FINANCE_ROLE_REQUIRED", message: "Only finance roles can manage stock controls." });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const itemId = typeof body.item_id === "string" && body.item_id ? body.item_id : null;
    if (!itemId) {
      return fail(422, { code: "ITEM_REQUIRED", message: "Select an inventory item." });
    }

    const item = await getInventoryItem(auth.context, itemId);
    const movement: StockMovementInput = {
      item_id: itemId,
      warehouse_id: typeof body.warehouse_id === "string" && body.warehouse_id ? body.warehouse_id : null,
      movement_type: body.movement_type === "receipt" || body.movement_type === "issue" || body.movement_type === "transfer" || body.movement_type === "dispatch" ? body.movement_type : "adjustment",
      quantity: Number(body.quantity ?? 0),
      unit_cost: Number(body.unit_cost ?? item.purchase_price ?? 0),
      source_type: typeof body.source_type === "string" && body.source_type ? body.source_type : null,
      source_id: typeof body.source_id === "string" && body.source_id ? body.source_id : null,
      reason: typeof body.reason === "string" && body.reason ? body.reason : null,
      status: body.status === "posted" ? "posted" : "draft"
    };

    const validation = validateStockMovement({ movement, item });
    if (!validation.ok) {
      return fail(422, { code: "INVALID_STOCK_MOVEMENT", message: validation.errors[0] ?? "Invalid stock movement." });
    }

    const { data: created, error: createError } = await auth.context.supabase
      .from("stock_movements")
      .insert({
        org_id: auth.context.orgId,
        item_id: movement.item_id,
        warehouse_id: movement.warehouse_id,
        movement_type: movement.movement_type,
        quantity: validation.normalizedQuantity,
        unit_cost: validation.normalizedUnitCost,
        source_type: movement.source_type,
        source_id: movement.source_id,
        reason: movement.reason,
        status: "draft",
        created_by: auth.context.userId
      })
      .select("id")
      .single();

    if (createError || !created) {
      return fail(400, { code: "STOCK_CONTROL_CREATE_FAILED", message: createError?.message ?? "Stock movement could not be created." });
    }

    let nextItem = item;
    let journalEntryId: string | null = null;
    if (movement.status === "posted") {
      const applied = applyStockMovement(item, { ...movement, quantity: validation.normalizedQuantity, unit_cost: validation.normalizedUnitCost });
      nextItem = await setInventoryQuantity(auth.context, item.id, applied.quantityOnHand);
      await syncLowStockException(auth.context, nextItem);
      journalEntryId = await postStockMovementJournal(auth.context, {
        movementId: String(created.id),
        movementType: movement.movement_type,
        quantity: validation.normalizedQuantity,
        unitCost: validation.normalizedUnitCost,
        itemLabel: item.name ?? item.sku ?? "inventory item",
        entryDate: new Date().toISOString().slice(0, 10),
        reason: movement.reason
      });
      const { error: statusError } = await auth.context.supabase
        .from("stock_movements")
        .update({ status: "posted" })
        .eq("org_id", auth.context.orgId)
        .eq("id", created.id);

      if (statusError) {
        return fail(400, { code: "STOCK_CONTROL_POST_FAILED", message: statusError.message });
      }
    }

    const record = await loadMovement(auth.context, String(created.id));

    await auth.context.supabase.from("audit_logs").insert({
      org_id: auth.context.orgId,
      user_id: auth.context.userId,
      action: movement.status === "posted" ? "post" : "create",
      entity_type: "stock_movement",
      entity_id: String(created.id),
      new_values: {
        ...movement,
        quantity: validation.normalizedQuantity,
        unit_cost: validation.normalizedUnitCost,
        resulting_quantity_on_hand: nextItem.quantity_on_hand,
        journal_entry_id: journalEntryId
      }
    });

    return ok(record, undefined, { status: 201 });
  } catch (error) {
    return fail(500, { code: "STOCK_CONTROL_CREATE_FAILED", message: errorMessage(error) });
  }
}

