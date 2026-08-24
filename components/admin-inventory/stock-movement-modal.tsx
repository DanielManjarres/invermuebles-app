import type { FormEvent } from "react";
import { X } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { IntegerInput } from "@/components/ui/integer-input";
import type { InventoryItem } from "@/components/admin-inventory/inventory-groups";
import {
  movementLabels,
  movementReasonOptions,
  type MovementType,
  type StockMovementFormState,
} from "@/lib/stock-movements";

type StockMovementModalProps = {
  error: string;
  form: StockMovementFormState;
  hasValidQuantity: boolean;
  isInvalidExit: boolean;
  item: InventoryItem;
  movementQuantity: number;
  movementSummaryText: string;
  onClose: () => void;
  onFormChange: (form: StockMovementFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTypeChange: (type: MovementType) => void;
  projectedStock: number | null;
  saving: boolean;
};

const notePlaceholders: Record<MovementType, string> = {
  entry: "Ej: Reposición recibida en buen estado",
  exit: "Ej: Venta confirmada por WhatsApp",
  adjustment: "Ej: Conteo físico realizado en bodega",
};

export function StockMovementModal({
  error,
  form,
  hasValidQuantity,
  isInvalidExit,
  item,
  movementQuantity,
  movementSummaryText,
  onClose,
  onFormChange,
  onSubmit,
  onTypeChange,
  projectedStock,
  saving,
}: StockMovementModalProps) {
  const reasonOptions = form.type ? movementReasonOptions[form.type] : [];
  const notePlaceholder = form.type ? notePlaceholders[form.type] : "Opcional";

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <form className="adminModal smallModal" onSubmit={onSubmit}>
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Movimiento de inventario</p>
            <h2>{item.productName}</h2>
            <p>
              {item.variantName} · {item.reference}
            </p>
          </div>
          <button
            className="modalClose"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="stockSummary">
          <span>Stock actual</span>
          <strong>{item.stock}</strong>
        </div>

        <p className="formHint">
          Registra entradas cuando llegue mercancía, salidas cuando se entregue o
          venda un producto, y ajustes cuando el conteo físico no coincida.
        </p>

        <div className="movementTypeGroup" aria-label="Tipo de movimiento">
          {(Object.keys(movementLabels) as MovementType[]).map((type) => (
            <button
              className={
                form.type === type
                  ? "movementTypeButton active"
                  : "movementTypeButton"
              }
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
            >
              {movementLabels[type]}
            </button>
          ))}
        </div>

        <div className="adminFormGrid movementFormGrid">
          <label>
            {form.type === "adjustment" ? "Cantidad real contada" : "Cantidad"}
            <IntegerInput
              autoFocus
              min={form.type === "adjustment" ? 0 : 1}
              onValueChange={(quantity) =>
                onFormChange({ ...form, quantity: quantity === "" ? "" : String(quantity) })
              }
              required
              value={form.quantity === "" ? "" : Number(form.quantity)}
            />
          </label>
          <label>
            Motivo
            <SelectMenu
              disabled={!form.type}
              options={reasonOptions.map((reason) => ({
                label: reason,
                value: reason,
              }))}
              placeholder="Selecciona un motivo"
              value={form.reason}
              onChange={(value) => onFormChange({ ...form, reason: value })}
            />
          </label>
          <label className="adminFormWide">
            Observación
            <textarea
              placeholder={notePlaceholder}
              rows={3}
              value={form.note}
              onChange={(event) =>
                onFormChange({ ...form, note: event.target.value })
              }
            />
          </label>
        </div>

        <div
          className={
            isInvalidExit
              ? "movementPreview movementPreviewWarning"
              : "movementPreview"
          }
        >
          <div>
            <span>Stock actual</span>
            <strong>{item.stock}</strong>
          </div>
          <div>
            <span>Movimiento</span>
            <strong>
              {hasValidQuantity
                ? form.type === "entry"
                  ? `+${movementQuantity}`
                  : form.type === "exit"
                    ? `-${movementQuantity}`
                    : movementQuantity
                : "-"}
            </strong>
          </div>
          <div>
            <span>Stock final</span>
            <strong>{projectedStock ?? "-"}</strong>
          </div>
          <p>{movementSummaryText}</p>
        </div>

        {error ? <p className="formError">{error}</p> : null}

        <div className="modalActions">
          <button
            className="secondaryButton"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button className="primaryButton" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
