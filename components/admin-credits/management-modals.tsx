import { useRef, type FormEvent } from "react";
import { Trash2 } from "lucide-react";

import { paymentOptions } from "@/components/admin-credits/form-controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SelectMenu } from "@/components/ui/select-menu";
import { useModalAccessibility } from "@/components/ui/use-modal-accessibility";
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
  const editDialogRef = useRef<HTMLFormElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    active: Boolean(editCredit),
    blockClose: managing,
    dialogRef: editDialogRef,
    onClose: onEditClose,
  });

  useModalAccessibility({
    active: Boolean(deleteCredit),
    blockClose: managing,
    dialogRef: deleteDialogRef,
    onClose: onDeleteClose,
  });

  return (
    <>
      {editCredit ? (
        <div className="adminModalBackdrop" role="presentation">
          <form
            aria-busy={managing}
            aria-describedby="edit-credit-warning"
            aria-labelledby="edit-credit-title"
            aria-modal="true"
            className="adminModal creditManagementModal"
            ref={editDialogRef}
            role="dialog"
            tabIndex={-1}
            onSubmit={onEditSubmit}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Corrección administrativa</p>
                <h2 id="edit-credit-title">Editar crédito #{editCredit.shortId}</h2>
              </div>
              <button
                aria-label="Cerrar edición de crédito"
                className="iconButton"
                disabled={managing}
                type="button"
                onClick={onEditClose}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="recordDeleteWarning" id="edit-credit-warning">
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
                  onValueChange={onEditInitialPaymentChange}
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
            aria-busy={managing}
            aria-describedby="delete-credit-warning"
            aria-labelledby="delete-credit-title"
            aria-modal="true"
            className="adminModal recordDeleteModal creditManagementModal"
            ref={deleteDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2 id="delete-credit-title">Eliminar crédito</h2>
              </div>
              <button
                aria-label="Cerrar eliminación de crédito"
                className="iconButton"
                disabled={managing}
                type="button"
                onClick={onDeleteClose}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="recordDeleteWarning" id="delete-credit-warning">
              El crédito y su pago inicial se eliminarán permanentemente. La venta se conservará pendiente para
              configurar otra financiación.
            </div>
            <div className="recordDeleteTarget">
              <span>Crédito seleccionado</span>
              <strong>Cuenta {deleteCredit.shortId}</strong>
              <small>
                Venta N.º {deleteCredit.saleShortId} · {deleteCredit.customerName}
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
