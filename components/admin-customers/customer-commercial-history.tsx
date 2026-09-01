import Link from "next/link";
import { BadgeCheck, CreditCard, ReceiptText } from "lucide-react";
import {
  getCustomerPaymentLabel,
  type AdminCustomer,
} from "@/lib/customers";

type CustomerCommercialHistoryProps = {
  customer: AdminCustomer;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    currency: "COP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function CustomerCommercialHistory({
  customer,
}: CustomerCommercialHistoryProps) {
  const hasCommercialActivity =
    customer.recentAccounts.length > 0 || customer.recentPayments.length > 0;

  return (
    <>
      <div className="customerHistoryGrid">
        <article>
          <BadgeCheck size={20} />
          <span>Ventas / pedidos</span>
          <div className="customerHistoryTotals">
            <strong>
              {customer.salesCount}{" "}
              {customer.salesCount === 1 ? "venta" : "ventas"}
            </strong>
            <strong>
              {customer.ordersCount}{" "}
              {customer.ordersCount === 1 ? "pedido" : "pedidos"}
            </strong>
          </div>
          <nav
            className="customerHistoryActions"
            aria-label="Historial comercial"
          >
            <Link
              href={`/admin/ventas?cliente=${encodeURIComponent(customer.document)}`}
            >
              Ver ventas
            </Link>
            <Link
              href={`/admin/pedidos?cliente=${encodeURIComponent(customer.document)}`}
            >
              Ver pedidos
            </Link>
          </nav>
        </article>
        <article>
          <CreditCard size={20} />
          <span>Créditos registrados</span>
          <strong>{customer.creditsCount}</strong>
          <small>Activos o en mora: {customer.activeCreditsCount}</small>
        </article>
        <article>
          <ReceiptText size={20} />
          <span>Pagos registrados</span>
          <strong>{customer.paymentsCount}</strong>
          <small>Total recibido: {formatMoney(customer.totalPaid)}</small>
        </article>
      </div>

      {hasCommercialActivity ? (
        <>
          <section className="customerActivityPanel customerPortfolioPanel">
          <div className="customerActivityHeader">
            <div>
              <strong>Cuentas recientes</strong>
              <small>Productos, saldos y pagos de las últimas cuentas.</small>
            </div>
            <Link
              href={`/admin/cartera?buscar=${encodeURIComponent(customer.document)}`}
            >
              Ver cartera
            </Link>
          </div>
          <div className="customerActivityList">
            {customer.recentAccounts.length > 0 ? (
              customer.recentAccounts.map((account) => (
                <article key={account.id}>
                  <div>
                    <strong>{account.title} #{account.shortId}</strong>
                    <span>{account.products}</span>
                    <span>
                      {account.statusLabel} · {account.paymentsCount} pago(s)
                    </span>
                    <small>
                      Venta N.º {account.saleShortId} · {account.createdAt} · Último pago: {account.lastPaymentAt}
                    </small>
                  </div>
                  <div className="customerActivityValues">
                    <strong>{formatMoney(account.balance)}</strong>
                    <span>de {formatMoney(account.total)}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="customerActivityEmpty">Sin cuentas registradas.</p>
            )}
          </div>
          </section>

          <section className="customerActivityPanel customerPaymentsPanel">
        <div className="customerActivityHeader">
          <div>
            <strong>Pagos recientes</strong>
            <small>Último pago: {customer.lastPaymentAt}</small>
          </div>
        </div>
        <div className="customerPaymentList">
          {customer.recentPayments.length > 0 ? (
            customer.recentPayments.map((payment) => (
              <article key={payment.id}>
                <div>
                  <strong>{formatMoney(payment.amount)}</strong>
                  <span>
                    {payment.accountTitle} #{payment.accountShortId}
                  </span>
                </div>
                <div>
                  <strong>{payment.methodLabel}</strong>
                  <span>
                    {getCustomerPaymentLabel(
                      payment.saleType,
                      payment.isInitial,
                    )}
                  </span>
                </div>
                <small>{payment.createdAt}</small>
              </article>
            ))
          ) : (
            <p className="customerActivityEmpty">Sin pagos registrados.</p>
          )}
        </div>
          </section>
        </>
      ) : (
        <div className="customerCommercialEmpty">
          <ReceiptText size={24} />
          <div>
            <strong>Sin actividad comercial</strong>
            <p>Este cliente todavía no tiene cuentas ni pagos registrados.</p>
          </div>
        </div>
      )}
    </>
  );
}
