import type { StockMovementType } from "@prisma/client";

const initialInventoryNotes = [
  "Carga inicial de productos",
  "Producto creado desde gestion de productos",
];

const variantInitialInventoryNotes = [
  "Variante creada desde gestión de productos",
  "Variante creada junto con el producto",
];

type ProductDeleteMovement = {
  note: string | null;
  reason: string;
  type: StockMovementType;
};

type ProductDeletePolicyParams = {
  orderItemsCount: number;
  saleItemsCount?: number;
  stockMovements: ProductDeleteMovement[];
};

export function canDeleteProduct({
  orderItemsCount,
  saleItemsCount = 0,
  stockMovements,
}: ProductDeletePolicyParams) {
  if (orderItemsCount > 0) {
    return {
      allowed: false,
      reason:
        "Este producto ya tiene pedidos registrados. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
    };
  }

  if (saleItemsCount > 0) {
    return {
      allowed: false,
      reason:
        "Este producto ya tiene ventas registradas. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
    };
  }

  const hasOnlyInitialMovements = stockMovements.every(
    (movement) =>
      movement.reason === "Inventario inicial" &&
      ((movement.type === "ADJUSTMENT" &&
        initialInventoryNotes.includes(movement.note ?? "")) ||
        (movement.type === "ENTRY" &&
          variantInitialInventoryNotes.includes(movement.note ?? ""))),
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
