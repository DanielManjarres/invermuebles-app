import type { FormEvent } from "react";
import { WalletCards } from "lucide-react";

import { paymentOptions } from "@/components/admin-credits/form-controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SelectMenu } from "@/components/ui/select-menu";
import type { PaymentMethod } from "@/lib/credits";
import type { PortfolioAccount } from "@/lib/portfolio";

type Props = {
  account: PortfolioAccount;
  amount: number;
  error: string;
  method: PaymentMethod | "";
  note: string;
  onAmountChange: (amount: number) => void;
  onClose: () => void;
  onMethodChange: (method: PaymentMethod) => void;
  onNoteChange: (note: string) => void;
  onReferenceChange: (reference: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reference: string;
  saving: boolean;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

export function AdminCreditPaymentModal({
  account,
  amount,
  error,
  method,
  note,
  onAmountChange,
  onClose,
  onMethodChange,
  onNoteChange,
  onReferenceChange,
  onSubmit,
  reference,
  saving,
}: Props) {
  return (
    <div className="adminModalBackdrop" role="presentation">
      <form
        aria-labelledby="payment-modal-title"
        aria-modal="true"
        className="adminModal creditPaymentModal"
        role="dialog"
        onSubmit={onSubmit}
      >
        <div className="modalHeader">
          <div>
            <p className="eyebrow">{account.title} #{account.shortId}</p>
            <h2 id="payment-modal-title">Registrar abono</h2>
          </div>
          <button className="iconButton" disabled={saving} type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="recordDeleteTarget">
          <span>Cuenta seleccionada</span>
          <strong>{account.customerName}</strong>
          <small>Venta N.º {account.saleShortId} · Saldo disponible {formatMoney(account.balance)}</small>
        </div>

        {error ? <p className="creditFormMessage error">{error}</p> : null}

        <div className="creditPaymentFields">
          <label>
            Valor recibido
            <MoneyInput
              id="payment-amount"
              onValueChange={onAmountChange}
              placeholder="Ej: 100.000"
              value={amount}
            />
          </label>
          <label>
            Medio
            <SelectMenu
              options={paymentOptions}
              placeholder="Selecciona medio"
              value={method}
              onChange={(value) => onMethodChange(value as PaymentMethod)}
            />
          </label>
          <label>
            Comprobante
            <input
              type="text"
              value={reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>

        <label>
          Observación
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Ej: abono mensual o transferencia confirmada."
          />
        </label>

        <p className="creditPaymentHint">
          El pago se aplicará según las condiciones de la cuenta seleccionada.
        </p>

        <div className="modalActions">
          <button className="secondaryButton" disabled={saving} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primaryButton" disabled={saving} type="submit">
            <WalletCards size={18} />
            {saving ? "Guardando..." : "Registrar abono"}
          </button>
        </div>
      </form>
    </div>
  );
}
