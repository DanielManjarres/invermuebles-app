import type { MovementType } from "@/lib/stock-movements";

export function calculateNextStock(
  currentStock: number,
  movementType: MovementType,
  quantity: number,
) {
  if (movementType === "entry") {
    return currentStock + quantity;
  }

  if (movementType === "exit") {
    return currentStock - quantity;
  }

  return quantity;
}

export function isValidStockQuantity(quantity: number) {
  return Number.isFinite(quantity) && quantity > 0 && Number.isInteger(quantity);
}
