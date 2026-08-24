import Image from "next/image";
import { Printer, X } from "lucide-react";

import { company } from "@/lib/company";
import { getPaymentReceiptNumber } from "@/lib/payment-receipt";
import type { PortfolioAccount, PortfolioPayment } from "@/lib/portfolio";

type Props = {
  account: PortfolioAccount;
  balanceAfter: number;
  onClose: () => void;
  payment: PortfolioPayment;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function AdminPaymentReceiptModal({ account, balanceAfter, onClose, payment }: Props) {
  const receiptNumber = getPaymentReceiptNumber(payment.id);

  return (
    <div className="adminModalBackdrop paymentReceiptBackdrop" role="presentation">
      <section
        aria-labelledby="payment-receipt-title"
        aria-modal="true"
        className="adminModal paymentReceiptModal"
        role="dialog"
      >
        <div className="paymentReceiptActions">
          <button className="secondaryButton" type="button" onClick={onClose}>
            <X size={18} />
            Cerrar
          </button>
          <button className="primaryButton" type="button" onClick={() => window.print()}>
            <Printer size={18} />
            Imprimir recibo
          </button>
        </div>

        <div className="paymentReceiptSheet">
          <header className="paymentReceiptHeader">
            <div className="paymentReceiptBrand">
              <Image
                alt={`Logo de ${company.name}`}
                height={72}
                src="/logo-invermuebles.png"
                width={72}
              />
              <div>
                <strong>{company.name}</strong>
                <span>{company.location}</span>
                <span>Tel. {company.whatsappLabel}</span>
              </div>
            </div>
            <div className="paymentReceiptIdentity">
              <h2 id="payment-receipt-title">Recibo de pago</h2>
              <strong>N.º {receiptNumber}</strong>
              <span>{payment.createdAt}</span>
            </div>
          </header>

          <div className="paymentReceiptCustomer">
            <div><span>Cliente</span><strong>{account.customerName}</strong></div>
            <div><span>Cédula</span><strong>{account.customerDocument || "Sin registrar"}</strong></div>
            <div><span>Teléfono</span><strong>{account.customerPhone || "Sin registrar"}</strong></div>
          </div>

          <div className="paymentReceiptAccount">
            <div>
              <span>Cuenta</span>
              <strong>{account.title} #{account.shortId}</strong>
            </div>
            <div>
              <span>Venta relacionada</span>
              <strong>#{account.saleShortId}</strong>
            </div>
          </div>

          <div className="paymentReceiptProducts">
            <span>Productos</span>
            <ul>
              {account.items.map((item) => (
                <li key={item.id}>
                  <span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</span>
                  <strong>x {item.quantity}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="paymentReceiptAmounts">
            <div className="paymentReceiptTotal">
              <span>Valor recibido</span>
              <strong>{formatMoney(payment.amount)}</strong>
            </div>
            <div><span>Medio de pago</span><strong>{payment.methodLabel}</strong></div>
            {payment.principalAmount !== null ? (
              <div><span>Aplicado a capital</span><strong>{formatMoney(payment.principalAmount)}</strong></div>
            ) : null}
            {payment.interestAmount !== null ? (
              <div><span>Aplicado a interés</span><strong>{formatMoney(payment.interestAmount)}</strong></div>
            ) : null}
            <div><span>Saldo restante</span><strong>{formatMoney(balanceAfter)}</strong></div>
          </div>

          {payment.reference || payment.note ? (
            <div className="paymentReceiptNotes">
              {payment.reference ? <p><strong>Comprobante:</strong> {payment.reference}</p> : null}
              {payment.note ? <p><strong>Observación:</strong> {payment.note}</p> : null}
            </div>
          ) : null}

          <footer className="paymentReceiptFooter">
            <div><span>Recibido por</span><strong>{payment.userName}</strong></div>
            <div className="paymentReceiptSignature"><span>Firma del cliente</span></div>
            <p>Este documento certifica la recepción del pago indicado.</p>
          </footer>
        </div>
      </section>
    </div>
  );
}
