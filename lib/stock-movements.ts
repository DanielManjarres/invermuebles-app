export type MovementType = "entry" | "exit" | "adjustment";

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  productReference: string;
  productCategory: string;
  productClass: string;
  variantId?: string;
  variantName?: string;
  variantReference?: string;
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
