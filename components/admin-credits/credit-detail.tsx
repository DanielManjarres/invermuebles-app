import { Pencil, Trash2, UserRound, WalletCards } from "lucide-react";

import type { AdminCredit } from "@/lib/credits";

type Props = {
  canManage: boolean;
  credit: AdminCredit;
  managing: boolean;
  noticeVisible: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onLockedAction: () => void;
  onPayment: () => void;
  paymentDisabled: boolean;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

export function AdminCreditDetail({
  canManage,
  credit,
  managing,
  noticeVisible,
  onDelete,
  onEdit,
  onLockedAction,
  onPayment,
  paymentDisabled,
}: Props) {
  return (
    <div className="creditSelectedAccount">
      <div className="creditDetailHeader">
        <div>
          <span className="sectionEyebrow">Cuenta #{credit.shortId}</span>
          <h3>{credit.saleTypeLabel}</h3>
          <p>
            Venta #{credit.saleShortId} · {credit.months} mes(es) · {credit.interestRate}% interés
          </p>
        </div>
        <div className="creditHeaderActions">
          <span className={`creditStatus creditStatus-${credit.status.toLowerCase()}`}>
            {credit.statusLabel}
          </span>
          {credit.status === "ACTIVE" || credit.status === "OVERDUE" ? (
            <button className="primaryButton" disabled={paymentDisabled} type="button" onClick={onPayment}>
              <WalletCards size={16} />
              Registrar abono
            </button>
          ) : null}
          {credit.status === "ACTIVE" || credit.status === "OVERDUE" ? (
            <>
              <button
                aria-disabled={!canManage || managing}
                className={`secondaryButton${!canManage ? " isDisabled" : ""}`}
                disabled={managing}
                type="button"
                onClick={canManage ? onEdit : onLockedAction}
              >
                <Pencil size={16} />
                Editar crédito
              </button>
              <button
                aria-disabled={!canManage || managing}
                className={`dangerButton${!canManage ? " isDisabled" : ""}`}
                disabled={managing}
                type="button"
                onClick={canManage ? onDelete : onLockedAction}
              >
                <Trash2 size={16} />
                Eliminar crédito
              </button>
            </>
          ) : null}
        </div>
      </div>

      {noticeVisible ? (
        <p className="creditFormMessage error">
          Este crédito conserva abonos posteriores o un estado final y no permite editar ni eliminar su financiación.
        </p>
      ) : null}

      <div className="creditFigures">
        <article>
          <span>Capital inicial</span>
          <strong>{formatMoney(credit.principal)}</strong>
        </article>
        <article>
          <span>Interés acordado</span>
          <strong>{credit.interestRate}%</strong>
        </article>
        <article>
          <span>Capital pendiente</span>
          <strong>{formatMoney(credit.outstandingPrincipal)}</strong>
        </article>
        <article>
          <span>Interés pendiente</span>
          <strong>{formatMoney(credit.interestBalance)}</strong>
        </article>
        <article className="creditFigureBalance">
          <span>{credit.status === "PAID" ? "Total pagado" : "Saldo total"}</span>
          <strong>{formatMoney(credit.status === "PAID" ? credit.total : credit.balance)}</strong>
        </article>
      </div>

      <div className="creditSaleSummary">
        <div>
          <strong>
            {credit.saleTypeLabel} · Venta #{credit.saleShortId}
          </strong>
        </div>
        <ul>
          {credit.items.map((item) => (
            <li key={item.id}>
              <span>
                {item.productName}{item.variantName ? ` · ${item.variantName}` : ""} x {item.quantity}
              </span>
              <b>{formatMoney(item.lineTotal)}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="creditPaymentList">
        <div>
          <UserRound size={24} />
          <div>
            <h3>Historial de pagos</h3>
            <p>{credit.payments.length} registro(s)</p>
          </div>
        </div>

        {!credit.payments.length ? (
          <p className="creditNoPayments">Todavía no se han registrado abonos.</p>
        ) : (
          credit.payments.map((payment) => (
            <article key={payment.id}>
              <div>
                <strong>{formatMoney(payment.amount)}</strong>
                <span>
                  {payment.createdAt} · {payment.methodLabel}
                </span>
              </div>
              <div>
                <span>Capital: {formatMoney(payment.principalAmount)}</span>
                <span>Interés: {formatMoney(payment.interestAmount)}</span>
              </div>
              {payment.reference ? <small>Comprobante: {payment.reference}</small> : null}
              {payment.note ? <small>{payment.note}</small> : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
