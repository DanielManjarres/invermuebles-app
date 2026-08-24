import { Trash2 } from "lucide-react";
import type { StockMovement } from "@/lib/stock-movements";

type MovementCorrectionModalProps = {
  correcting: boolean;
  movement: StockMovement | null;
  onCancel: () => void;
  onConfirm: (movement: StockMovement) => void;
};

export function MovementCorrectionModal({
  correcting,
  movement,
  onCancel,
  onConfirm,
}: MovementCorrectionModalProps) {
  if (!movement) {
    return null;
  }

  return (
    <div className="modalOverlay" role="presentation">
      <div className="adminModal recordDeleteModal">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Correccion de registros</p>
            <h2>Corregir movimiento</h2>
          </div>
          <button
            aria-label="Cerrar confirmacion"
            className="modalClose"
            type="button"
            onClick={onCancel}
          >
            x
          </button>
        </div>

        <div className="recordDeleteWarning">
          <Trash2 size={20} />
          <p>
            El registro original se conservara. El sistema creara un
            movimiento inverso para devolver el stock al estado anterior.
          </p>
        </div>

        <div className="recordDeleteTarget">
          <span>Movimiento seleccionado</span>
          <strong>{movement.productName}</strong>
          <small>
            Stock {movement.previousStock} -&gt; {movement.nextStock}
          </small>
        </div>

        <div className="modalActions">
          <button className="secondaryButton" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="dangerButton"
            disabled={correcting}
            type="button"
            onClick={() => onConfirm(movement)}
          >
            <Trash2 size={18} />
            {correcting ? "Corrigiendo..." : "Confirmar correccion"}
          </button>
        </div>
      </div>
    </div>
  );
}
