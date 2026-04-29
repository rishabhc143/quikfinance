import type { ApiContext } from "@/lib/api/auth";
import { resolveWorkflowExceptions, upsertWorkflowException } from "@/lib/compliance/exceptions";
import { isLowStock, type InventoryStockItem } from "@/lib/inventory/stock-control";

export async function getInventoryItem(context: ApiContext, itemId: string) {
  const { data, error } = await context.supabase
    .from("items")
    .select("id, sku, name, quantity_on_hand, reorder_point, purchase_price")
    .eq("org_id", context.orgId)
    .eq("id", itemId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Inventory item could not be loaded.");
  }

  return data as InventoryStockItem;
}

export async function setInventoryQuantity(context: ApiContext, itemId: string, quantityOnHand: number) {
  const { data, error } = await context.supabase
    .from("items")
    .update({ quantity_on_hand: quantityOnHand })
    .eq("org_id", context.orgId)
    .eq("id", itemId)
    .select("id, sku, name, quantity_on_hand, reorder_point, purchase_price")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Inventory quantity could not be updated.");
  }

  return data as InventoryStockItem;
}

export async function syncLowStockException(context: ApiContext, item: InventoryStockItem) {
  const title = "Item is below reorder point";
  const description = `${item.name ?? item.sku ?? "Inventory item"} is at ${Number(item.quantity_on_hand)} on hand against a reorder point of ${Number(item.reorder_point)}.`;

  if (isLowStock(Number(item.quantity_on_hand), Number(item.reorder_point ?? 0))) {
    await upsertWorkflowException(context, {
      category: "inventory",
      severity: Number(item.quantity_on_hand) <= 0 ? "critical" : "high",
      title,
      description,
      entityType: "inventory_item_low_stock",
      entityId: item.id
    });
    return;
  }

  await resolveWorkflowExceptions(context, {
    entityType: "inventory_item_low_stock",
    entityId: item.id,
    resolution: "Stock position recovered above the reorder point."
  });
}

