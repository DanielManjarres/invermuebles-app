import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";

import { MoneyInput, paymentOptions } from "@/components/admin-credits/form-controls";
import { SelectMenu } from "@/components/select-menu";
import type { AdminCredit, PaymentMethod } from "@/lib/credits";

type CreditStatus = "ACTIVE" | "OVERDUE";

type Props = {
  deleteConfirmation: string;
  deleteCredit: AdminCredit | null;
  editCredit: AdminCredit | null;
  editInitialPayment: number;
  editInterestRate: number;
  editMethod: PaymentMethod | "";
  editMonths: number;
  editStatus: CreditStatus;
  managing: boolean;
  onDeleteClose: () => void;
  onDeleteConfirmationChange: (confirmation: string) => void;
  onDeleteConfirm: () => void;
  onEditClose: () => void;
  onEditInitialPaymentChange: (payment: number) => void;
  onEditInterestRateChange: (rate: number) => void;
  onEditMethodChange: (method: PaymentMethod) => void;
  onEditMonthsChange: (months: number) => void;
  onEditStatusChange: (status: CreditStatus) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const editableStatusOptions = [
  { label: "Activo", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
];

export function AdminCreditManagementModals({
  deleteConfirmation,
  deleteCredit,
  editCredit,
  editInitialPayment,
  editInterestRate,
  editMethod,
  editMonths,
  editStatus,
  managing,
  onDeleteClose,
  onDeleteConfirmationChange,
  onDeleteConfirm,
  onEditClose,
  onEditInitialPaymentChange,
  onEditInterestRateChange,
  onEditMethodChange,
  onEditMonthsChange,
  onEditStatusChange,
  onEditSubmit,
}: Props) {
  return (
    <>
      {editCredit ? (
        <div className="adminModalBackdrop" role="presentation">
          <form
            aria-labelledby="edit-credit-title"
            aria-modal="true"
            className="adminModal"
            role="dialog"
            onSubmit={onEditSubmit}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Corrección administrativa</p>
                <h2 id="edit-credit-title">Editar crédito #{editCredit.shortId}</h2>
              </div>
              <button className="iconButton" disabled={managing} type="button" onClick={onEditClose}>
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="recordDeleteWarning">
              Solo se permite corregir la financiación mientras no existan abonos posteriores al pago inicial.
            </div>

            <div className="adminFormGrid">
              <label>
                Plazo en meses
                <input
                  min="1"
                  max="120"
                  type="number"
                  value={editMonths}
                  onChange={(event) => onEditMonthsChange(Number(event.target.value))}
                />
              </label>
              <label>
                Interés (%)
                <input
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  value={editInterestRate}
                  onChange={(event) => onEditInterestRateChange(Number(event.target.value))}
                />
              </label>
              <label>
                Pago inicial
                <MoneyInput
                  id="edit-initial-payment"
                  value={editInitialPayment}
                  onChange={onEditInitialPaymentChange}
                />
              </label>
              <label>
                Medio del pago inicial
                <SelectMenu
                  disabled={!editInitialPayment}
                  options={paymentOptions}
                  placeholder="Sin pago inicial"
                  value={editMethod}
                  onChange={(value) => onEditMethodChange(value as PaymentMethod)}
                />
              </label>
              <label>
                Estado
                <SelectMenu
                  options={editableStatusOptions}
                  placeholder="Selecciona estado"
                  value={editStatus}
                  onChange={(value) => onEditStatusChange(value as CreditStatus)}
                />
              </label>
            </div>

            <div className="modalActions">
              <button className="secondaryButton" disabled={managing} type="button" onClick={onEditClose}>
                Cancelar
              </button>
              <button className="primaryButton" disabled={managing} type="submit">
                {managing ? "Guardando..." : "Guardar corrección"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteCredit ? (
        <div className="adminModalBackdrop" role="presentation">
          <div
            aria-labelledby="delete-credit-title"
            aria-modal="true"
            className="adminModal recordDeleteModal"
            role="dialog"
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2 id="delete-credit-title">Eliminar crédito</h2>
              </div>
              <button className="iconButton" disabled={managing} type="button" onClick={onDeleteClose}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="recordDeleteWarning">
              El crédito y su pago inicial se eliminarán permanentemente. La venta se conservará pendiente para
              configurar otra financiación.
            </div>
            <div className="recordDeleteTarget">
              <span>Crédito seleccionado</span>
              <strong>Crédito #{deleteCredit.shortId}</strong>
              <small>
                Venta #{deleteCredit.saleShortId} · {deleteCredit.customerName}
              </small>
            </div>
            <label className="deleteConfirmationField">
              Escribe ELIMINAR para confirmar
              <input
                value={deleteConfirmation}
                onChange={(event) => onDeleteConfirmationChange(event.target.value)}
              />
            </label>
            <div className="modalActions">
              <button className="secondaryButton" disabled={managing} type="button" onClick={onDeleteClose}>
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={managing || deleteConfirmation !== "ELIMINAR"}
                type="button"
                onClick={onDeleteConfirm}
              >
                <Trash2 size={17} />
                {managing ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
