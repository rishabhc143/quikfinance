export type StockMovementType = "receipt" | "issue" | "transfer" | "adjustment" | "dispatch";
export type StockMovementStatus = "draft" | "posted" | "cancelled";

export type StockMovementInput = {
  item_id?: string | null;
  warehouse_id?: string | null;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost?: number | null;
  source_type?: string | null;
  source_id?: string | null;
  status?: StockMovementStatus;
  reason?: string | null;
};

export type InventoryStockItem = {
  id: string;
  sku?: string | null;
  name?: string | null;
  quantity_on_hand: number;
  reorder_point: number;
  purchase_price?: number | null;
};

export type StockValidationResult = {
  ok: boolean;
  errors: string[];
  normalizedQuantity: number;
  normalizedUnitCost: number;
  delta: number;
};

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeMovementQuantity(movementType: StockMovementType, quantity: number) {
  const numeric = toNumber(quantity);
  if (movementType === "adjustment") {
    return numeric;
  }
  return Math.abs(numeric);
}

export function normalizeUnitCost(unitCost: number | null | undefined) {
  return Math.max(0, toNumber(unitCost));
}

export function movementDelta(movementType: StockMovementType, quantity: number) {
  const normalizedQuantity = normalizeMovementQuantity(movementType, quantity);

  switch (movementType) {
    case "receipt":
      return Math.abs(normalizedQuantity);
    case "issue":
    case "dispatch":
      return -Math.abs(normalizedQuantity);
    case "transfer":
      return 0;
    case "adjustment":
    default:
      return normalizedQuantity;
  }
}

export function validateStockMovement(input: { movement: StockMovementInput; item: InventoryStockItem | null; requireWarehouse?: boolean }): StockValidationResult {
  const { movement, item, requireWarehouse = true } = input;
  const errors: string[] = [];
  const normalizedQuantity = normalizeMovementQuantity(movement.movement_type, movement.quantity);
  const normalizedUnitCost = normalizeUnitCost(movement.unit_cost);
  const delta = movementDelta(movement.movement_type, movement.quantity);

  if (!movement.item_id) {
    errors.push("Select an inventory item.");
  }

  if (requireWarehouse && !movement.warehouse_id) {
    errors.push("Select a warehouse.");
  }

  if (!item) {
    errors.push("Inventory item could not be loaded.");
  }

  if (movement.movement_type === "adjustment") {
    if (normalizedQuantity === 0) {
      errors.push("Adjustment quantity cannot be zero.");
    }
  } else if (normalizedQuantity <= 0) {
    errors.push("Quantity must be greater than zero.");
  }

  if (normalizedUnitCost < 0) {
    errors.push("Unit cost cannot be negative.");
  }

  if (item) {
    const nextQuantity = toNumber(item.quantity_on_hand) + delta;
    if ((movement.movement_type === "issue" || movement.movement_type === "dispatch") && nextQuantity < 0) {
      errors.push(`Insufficient stock for ${item.name ?? item.sku ?? "this item"}. Available quantity is ${toNumber(item.quantity_on_hand)}.`);
    }
    if (movement.movement_type === "adjustment" && nextQuantity < 0) {
      errors.push(`Adjustment would push ${item.name ?? item.sku ?? "this item"} below zero stock.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedQuantity,
    normalizedUnitCost,
    delta
  };
}

export function nextQuantityOnHand(item: InventoryStockItem, movement: StockMovementInput) {
  return toNumber(item.quantity_on_hand) + movementDelta(movement.movement_type, movement.quantity);
}

export function isLowStock(quantityOnHand: number, reorderPoint: number) {
  return toNumber(quantityOnHand) <= Math.max(0, toNumber(reorderPoint));
}

export function applyStockMovement(item: InventoryStockItem, movement: StockMovementInput) {
  const validation = validateStockMovement({ movement, item });
  if (!validation.ok) {
    throw new Error(validation.errors[0] ?? "Invalid stock movement.");
  }

  const quantityOnHand = nextQuantityOnHand(item, movement);
  return {
    quantityOnHand,
    lowStock: isLowStock(quantityOnHand, item.reorder_point)
  };
}

