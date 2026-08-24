import { Undo2 } from "lucide-react";
import { isProtectedStockMovement } from "@/lib/stock-movement-policy";
import { movementLabels, type StockMovement } from "@/lib/stock-movements";

type MovementListProps = {
  currentPage: number;
  movements: StockMovement[];
  onCorrect: (movement: StockMovement) => void;
  onPageChange: (page: number) => void;
  totalMovements: number;
  totalPages: number;
};

function getSignedQuantity(movement: StockMovement) {
  if (movement.type === "entry") return `+${movement.quantity}`;
  if (movement.type === "exit") return `-${movement.quantity}`;
  return movement.quantity;
}

export function MovementList({
  currentPage,
  movements,
  onCorrect,
  onPageChange,
  totalMovements,
  totalPages,
}: MovementListProps) {
  if (totalMovements === 0) {
    return (
      <div className="emptyState">
        <h2>No hay movimientos registrados</h2>
        <p>
          Cuando registres una entrada, salida o ajuste desde el inventario,
          aparecerá en esta pantalla.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="movementResultsBar">
        <span>
          Mostrando {movements.length} de {totalMovements} movimiento(s)
        </span>
        <span>
          Página {currentPage} de {totalPages}
        </span>
      </div>

      <div className="movementList">
        {movements.map((movement) => (
          <article className="movementCard" key={movement.id}>
            <div className="movementCardMain">
              <span className={`movementBadge ${movement.type}`}>
                {movementLabels[movement.type]}
              </span>
              <div>
                <h3>{movement.productName}</h3>
                <p>
                  {movement.productReference} - {movement.productCategory || "Sin tipo"}
                  {movement.productClass ? ` / ${movement.productClass}` : ""}
                </p>
              </div>
            </div>

            <dl className="movementCardData">
              <div>
                <dt>Fecha</dt>
                <dd>{movement.createdAt}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{getSignedQuantity(movement)}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>
                  {movement.previousStock} → {movement.nextStock}
                </dd>
              </div>
              <div className="movementUserCell">
                <dt>Usuario</dt>
                <dd>{movement.user}</dd>
                {!isProtectedStockMovement(movement) ? (
                  <button
                    aria-label="Corregir movimiento"
                    className="movementCorrectionLink"
                    title="Corregir movimiento"
                    type="button"
                    onClick={() => onCorrect(movement)}
                  >
                    <Undo2 size={13} />
                    Corregir
                  </button>
                ) : null}
              </div>
            </dl>

            <p className="movementReason">
              <strong>{movement.reason}</strong>
              {movement.note ? ` - ${movement.note}` : ""}
            </p>
          </article>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="paginationControls">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Anterior
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </>
  );
}
