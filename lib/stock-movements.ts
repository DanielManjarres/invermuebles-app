import type { Product } from "@/lib/products";

export type MovementType = "entry" | "exit" | "adjustment";

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  productReference: string;
  productCategory: string;
  productClass: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  nextStock: number;
  reason: string;
  note: string;
  createdAt: string;
  createdAtISO: string;
  user: string;
};

export type StockMovementFormState = {
  type: MovementType | "";
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
    type: "",
    quantity: "",
    reason: "",
    note: "",
  };
}

type CreateStockMovementParams = {
  nextStock: number;
  note?: string;
  previousStock: number;
  product: Product;
  quantity: number;
  reason: string;
  type: MovementType;
  user?: string;
};

export function createStockMovement({
  nextStock,
  note = "",
  previousStock,
  product,
  quantity,
  reason,
  type,
  user = "Administrador",
}: CreateStockMovementParams): StockMovement {
  const createdAt = new Date();

  return {
    id: `${product.id}-${createdAt.getTime()}`,
    productId: product.id,
    productName: product.name,
    productReference: product.reference,
    productCategory: product.category,
    productClass: product.productClass,
    type,
    quantity,
    previousStock,
    nextStock,
    reason,
    note: note.trim(),
    createdAt: createdAt.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    createdAtISO: createdAt.toISOString(),
    user,
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
