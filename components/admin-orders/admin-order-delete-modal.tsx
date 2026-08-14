"use client";

import { Trash2 } from "lucide-react";
import type { AdminOrder } from "@/lib/orders";

type AdminOrderDeleteModalProps = {
  confirmation: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirmationChange: (value: string) => void;
  onConfirm: () => void;
  order: AdminOrder;
};

export function AdminOrderDeleteModal({
  confirmation,
  deleting,
  onCancel,
  onConfirmationChange,
  onConfirm,
  order,
}: AdminOrderDeleteModalProps) {
  return (
    <div className="modalOverlay" role="presentation">
      <div className="adminModal recordDeleteModal">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Acción permanente</p>
            <h2>Eliminar pedido</h2>
          </div>
          <button
            aria-label="Cerrar confirmación"
            className="modalClose"
            type="button"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="recordDeleteWarning">
          <Trash2 size={20} />
          <p>
            El pedido y sus productos asociados se eliminarán permanentemente.
            Esta acción solo está disponible mientras no exista una venta relacionada.
          </p>
        </div>

        <div className="recordDeleteTarget">
          <span>Pedido seleccionado</span>
          <strong>Pedido #{order.shortId}</strong>
          <small>{order.totalQuantity} unidad(es)</small>
        </div>

        <label className="deleteConfirmationField">
          Escribe ELIMINAR para confirmar
          <input
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
          />
        </label>

        <div className="modalActions">
          <button className="secondaryButton" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="dangerButton"
            disabled={deleting || confirmation !== "ELIMINAR"}
            type="button"
            onClick={onConfirm}
          >
            <Trash2 size={18} />
            {deleting ? "Eliminando..." : "Eliminar permanentemente"}
          </button>
        </div>
      </div>
    </div>
  );
}
