import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";

import { MoneyInput } from "@/components/admin-sales/form-controls";
import { SelectMenu } from "@/components/select-menu";
import { paymentMethodLabels, type AdminSale, type PaymentMethod } from "@/lib/sales";

type Props = {
  deleteConfirmation: string;
  deletingSaleId: string;
  financeInitialPayment: number;
  financeInterestRate: number;
  financeMethod: PaymentMethod | "";
  financeMonths: number;
  financeStatus: "ACTIVE" | "OVERDUE";
  financing: boolean;
  saleToDelete: AdminSale | null;
  saleToFinance: AdminSale | null;
  onDeleteClose: () => void;
  onDeleteConfirm: (sale: AdminSale) => void;
  onDeleteConfirmationChange: (value: string) => void;
  onFinanceClose: () => void;
  onFinanceInitialPaymentChange: (value: number) => void;
  onFinanceInterestRateChange: (value: number) => void;
  onFinanceMethodChange: (value: PaymentMethod) => void;
  onFinanceMonthsChange: (value: number) => void;
  onFinanceStatusChange: (value: "ACTIVE" | "OVERDUE") => void;
  onFinanceSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const paymentMethodOptions = Object.entries(paymentMethodLabels).map(([value, label]) => ({
  label,
  value,
}));

const creditStatusOptions = [
  { label: "Activo", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

export function AdminSalesModals({
  deleteConfirmation,
  deletingSaleId,
  financeInitialPayment,
  financeInterestRate,
  financeMethod,
  financeMonths,
  financeStatus,
  financing,
  saleToDelete,
  saleToFinance,
  onDeleteClose,
  onDeleteConfirm,
  onDeleteConfirmationChange,
  onFinanceClose,
  onFinanceInitialPaymentChange,
  onFinanceInterestRateChange,
  onFinanceMethodChange,
  onFinanceMonthsChange,
  onFinanceStatusChange,
  onFinanceSubmit,
}: Props) {
  return (
    <>
      {saleToDelete ? (
        <div className="adminModalBackdrop" role="presentation">
          <div aria-labelledby="delete-sale-title" aria-modal="true" className="adminModal recordDeleteModal" role="dialog">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2 id="delete-sale-title">Eliminar venta</h2>
              </div>
              <button className="iconButton" type="button" title="Cerrar" onClick={onDeleteClose}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="recordDeleteWarning">
              La venta se eliminará permanentemente. Si tiene un crédito sin abonos posteriores,
              también se eliminarán el crédito y su pago inicial. Las existencias volverán al inventario.
            </div>
            <div className="recordDeleteTarget">
              <span>Venta seleccionada</span>
              <strong>Venta #{saleToDelete.shortId}</strong>
              <small>{saleToDelete.customerName}</small>
            </div>
            <label className="deleteConfirmationField">
              Escribe ELIMINAR para confirmar
              <input value={deleteConfirmation} onChange={(event) => onDeleteConfirmationChange(event.target.value)} />
            </label>
            <div className="modalActions">
              <button className="secondaryButton" type="button" onClick={onDeleteClose}>Cancelar</button>
              <button
                className="dangerButton"
                disabled={deletingSaleId === saleToDelete.id || deleteConfirmation !== "ELIMINAR"}
                type="button"
                onClick={() => onDeleteConfirm(saleToDelete)}
              >
                <Trash2 size={17} />
                {deletingSaleId === saleToDelete.id ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saleToFinance ? (
        <div className="adminModalBackdrop" role="presentation">
          <form aria-labelledby="configure-credit-title" aria-modal="true" className="adminModal" role="dialog" onSubmit={onFinanceSubmit}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Venta #{saleToFinance.shortId}</p>
                <h2 id="configure-credit-title">Configurar crédito</h2>
              </div>
              <button className="iconButton" disabled={financing} type="button" onClick={onFinanceClose}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="recordDeleteTarget">
              <span>Venta conservada</span>
              <strong>{saleToFinance.customerName}</strong>
              <small>Total de la venta: {formatMoney(saleToFinance.total)}</small>
            </div>
            <div className="adminFormGrid">
              <label>
                Plazo en meses
                <input min="1" max="120" type="number" value={financeMonths} onChange={(event) => onFinanceMonthsChange(Number(event.target.value))} />
              </label>
              <label>
                Interés (%)
                <input min="0" max="100" step="0.01" type="number" value={financeInterestRate} onChange={(event) => onFinanceInterestRateChange(Number(event.target.value))} />
              </label>
              <label>Pago inicial<MoneyInput value={financeInitialPayment} onValueChange={onFinanceInitialPaymentChange} /></label>
              <label>
                Medio del pago inicial
                <SelectMenu
                  disabled={!financeInitialPayment}
                  options={paymentMethodOptions}
                  placeholder="Sin pago inicial"
                  value={financeMethod}
                  onChange={(value) => onFinanceMethodChange(value as PaymentMethod)}
                />
              </label>
              <label>
                Estado
                <SelectMenu
                  options={creditStatusOptions}
                  placeholder="Selecciona estado"
                  value={financeStatus}
                  onChange={(value) => onFinanceStatusChange(value as "ACTIVE" | "OVERDUE")}
                />
              </label>
            </div>
            <div className="modalActions">
              <button className="secondaryButton" disabled={financing} type="button" onClick={onFinanceClose}>Cancelar</button>
              <button className="primaryButton" disabled={financing} type="submit">
                {financing ? "Configurando..." : "Crear crédito"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
