import Link from "next/link";
import { BadgeCheck, Ban, CreditCard } from "lucide-react";
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
  return (
    <>
      <div className="customerHistoryGrid">
        <article>
          <BadgeCheck size={20} />
          <span>Ventas / pedidos</span>
          <strong>
            {customer.salesCount} / {customer.ordersCount}
          </strong>
          <small>Última venta: {customer.lastSaleAt}</small>
        </article>
        <article>
          <CreditCard size={20} />
          <span>Créditos registrados</span>
          <strong>{customer.creditsCount}</strong>
          <small>Activos o en mora: {customer.activeCreditsCount}</small>
        </article>
        <article>
          <Ban size={20} />
          <span>Pagos registrados</span>
          <strong>{customer.paymentsCount}</strong>
          <small>Total recibido: {formatMoney(customer.totalPaid)}</small>
        </article>
      </div>

      <div className="customerActivityGrid">
        <section className="customerActivityPanel">
          <div className="customerActivityHeader">
            <div>
              <strong>Ventas recientes</strong>
              <small>Últimas compras registradas del cliente.</small>
            </div>
            <Link href="/admin/ventas">Ver ventas</Link>
          </div>
          <div className="customerActivityList">
            {customer.recentSales.length > 0 ? (
              customer.recentSales.map((sale) => (
                <article key={sale.id}>
                  <div>
                    <strong>Venta #{sale.shortId}</strong>
                    <span>{sale.products}</span>
                    <small>{sale.createdAt}</small>
                  </div>
                  <div className="customerActivityValues">
                    <strong>{formatMoney(sale.total)}</strong>
                    <span>
                      {sale.typeLabel} · {sale.statusLabel}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="customerActivityEmpty">Sin ventas registradas.</p>
            )}
          </div>
        </section>

        <section className="customerActivityPanel">
          <div className="customerActivityHeader">
            <div>
              <strong>Cartera reciente</strong>
              <small>Saldo y pagos de los últimos créditos.</small>
            </div>
            <Link href="/admin/cartera">Ver cartera</Link>
          </div>
          <div className="customerActivityList">
            {customer.recentCredits.length > 0 ? (
              customer.recentCredits.map((credit) => (
                <article key={credit.id}>
                  <div>
                    <strong>Crédito #{credit.shortId}</strong>
                    <span>
                      {credit.statusLabel} · {credit.paymentsCount} pago(s)
                    </span>
                    <small>Último pago: {credit.lastPaymentAt}</small>
                  </div>
                  <div className="customerActivityValues">
                    <strong>{formatMoney(credit.balance)}</strong>
                    <span>de {formatMoney(credit.total)}</span>
                  </div>
                </article>
              ))
            ) : (
              <p className="customerActivityEmpty">Sin créditos registrados.</p>
            )}
          </div>
        </section>
      </div>

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
  );
}
