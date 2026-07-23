import type { StockMovementType } from "@prisma/client";

const initialInventoryNotes = [
  "Carga inicial de productos",
  "Producto creado desde gestion de productos",
];

type ProductDeleteMovement = {
  note: string | null;
  reason: string;
  type: StockMovementType;
};

type ProductDeletePolicyParams = {
  orderItemsCount: number;
  stockMovements: ProductDeleteMovement[];
};

export function canDeleteProduct({
  orderItemsCount,
  stockMovements,
}: ProductDeletePolicyParams) {
  if (orderItemsCount > 0) {
    return {
      allowed: false,
      reason:
        "Este producto ya tiene pedidos registrados. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
    };
  }

  const hasOnlyInitialMovements = stockMovements.every(
    (movement) =>
      movement.type === "ADJUSTMENT" &&
      movement.reason === "Inventario inicial" &&
      initialInventoryNotes.includes(movement.note ?? ""),
  );

  if (!hasOnlyInitialMovements) {
    return {
      allowed: false,
      reason:
        "Este producto ya tiene movimientos de inventario. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}
