export type MovementType = "entry" | "exit" | "adjustment";

export type StockMovement = {
  id: string;
  productName: string;
  productReference: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  nextStock: number;
  reason: string;
  note: string;
  createdAt: string;
  user: string;
};

export type StockMovementFormState = {
  type: MovementType;
  quantity: string;
  reason: string;
  note: string;
};

export const stockMovementsStorageKey = "invermuebles_stock_movements";

export const movementLabels: Record<MovementType, string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
};

export const movementReasonOptions: Record<MovementType, string[]> = {
  entry: ["Reposición", "Compra nueva", "Devolución", "Otro"],
  exit: ["Venta", "Entrega", "Garantía", "Producto dañado", "Otro"],
  adjustment: [
    "Conteo físico",
    "Corrección de registro",
    "Inventario inicial",
    "Otro",
  ],
};

export function createMovementForm(): StockMovementFormState {
  return {
    type: "entry",
    quantity: "1",
    reason: movementReasonOptions.entry[0],
    note: "",
  };
}

export function readStockMovements() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedMovements = window.localStorage.getItem(stockMovementsStorageKey);
    return storedMovements ? (JSON.parse(storedMovements) as StockMovement[]) : [];
  } catch {
    return [];
  }
}

export function saveStockMovement(movement: StockMovement) {
  if (typeof window === "undefined") {
    return;
  }

  const movements = readStockMovements();
  window.localStorage.setItem(
    stockMovementsStorageKey,
    JSON.stringify([movement, ...movements])
  );
}
