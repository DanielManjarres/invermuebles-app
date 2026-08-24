type StockMovementPolicyInput = {
  reason: string;
};

function normalizeMovementText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function isProtectedStockMovement({
  reason,
}: StockMovementPolicyInput) {
  const normalizedReason = normalizeMovementText(reason);

  return (
    normalizedReason.startsWith("venta ") ||
    normalizedReason === "inventario reservado por separado" ||
    normalizedReason === "devolucion por eliminacion de venta" ||
    normalizedReason === "correccion de movimiento"
  );
}
