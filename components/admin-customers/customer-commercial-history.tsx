import Link from "next/link";
import { BadgeCheck, CreditCard, ReceiptText } from "lucide-react";
import type { AdminCustomer } from "@/lib/customers";

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
          <strong>{customer.salesCount} ventas</strong>
          <small>
            {customer.ordersCount} pedidos ·{" "}
            <Link
              href={`/admin/ventas?cliente=${encodeURIComponent(customer.document)}`}
            >
              Ver ventas
            </Link>
            {" · "}
            <Link
              href={`/admin/pedidos?cliente=${encodeURIComponent(customer.document)}`}
            >
              Ver pedidos
            </Link>
          </small>
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
              <strong>Cartera reciente</strong>
              <small>Productos, saldos y pagos de los últimos créditos.</small>
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
                      Venta #{account.saleShortId} · {account.createdAt} · Último pago: {account.lastPaymentAt}
                    </small>
                  </div>
                  <div className="customerActivityValues">
                    <strong>{formatMoney(account.balance)}</strong>
                    <span>de {formatMoney(account.total)}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="customerActivityEmpty">Sin créditos registrados.</p>
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
                  <span>Venta #{payment.saleShortId}</span>
                </div>
                <div>
                  <strong>{payment.methodLabel}</strong>
                  <span>{payment.isInitial ? "Pago inicial" : "Abono"}</span>
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
            <strong>Sin actividad de cartera</strong>
            <p>Este cliente todavía no tiene créditos ni pagos registrados.</p>
          </div>
        </div>
      )}
    </>
  );
}
