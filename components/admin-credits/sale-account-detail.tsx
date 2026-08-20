import { UserRound, WalletCards } from "lucide-react";

import type { PortfolioAccount } from "@/lib/portfolio";

type Props = {
  account: PortfolioAccount;
  paymentDisabled: boolean;
  onPayment: () => void;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

export function AdminSaleAccountDetail({ account, paymentDisabled, onPayment }: Props) {
  return (
    <div className="creditSelectedAccount">
      <div className="creditDetailHeader">
        <div>
          <span className="sectionEyebrow">Cuenta #{account.shortId}</span>
          <h3>{account.title}</h3>
          <p>Venta #{account.saleShortId} · {account.createdAt}</p>
        </div>
        <div className="creditHeaderActions">
          <span className={`creditStatus creditStatus-${account.status.toLowerCase()}`}>
            {account.statusLabel}
          </span>
          {account.kind === "RESERVED" && account.status === "ACTIVE" ? (
            <button className="primaryButton" disabled={paymentDisabled} type="button" onClick={onPayment}>
              <WalletCards size={16} />
              Registrar abono
            </button>
          ) : null}
        </div>
      </div>

      <div className="creditFigures creditSaleFigures">
        <article>
          <span>Total de la venta</span>
          <strong>{formatMoney(account.total)}</strong>
        </article>
        <article className={account.status === "PAID" ? "creditFigureBalance" : ""}>
          <span>Total pagado</span>
          <strong>{formatMoney(account.amountPaid)}</strong>
        </article>
        <article className={account.balance > 0 ? "creditFigureBalance" : ""}>
          <span>Saldo pendiente</span>
          <strong>{formatMoney(account.balance)}</strong>
        </article>
      </div>

      <div className="creditSaleSummary">
        <div><strong>{account.title} · Venta #{account.saleShortId}</strong></div>
        <ul>
          {account.items.map((item) => (
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
            <p>{account.payments.length} registro(s)</p>
          </div>
        </div>

        {!account.payments.length ? (
          <p className="creditNoPayments">Todavía no se han registrado pagos.</p>
        ) : (
          account.payments.map((payment) => (
            <article key={payment.id}>
              <div>
                <strong>{formatMoney(payment.amount)}</strong>
                <span>{payment.createdAt} · {payment.methodLabel}</span>
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
