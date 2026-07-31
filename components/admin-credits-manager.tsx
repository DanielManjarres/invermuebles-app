"use client";

import { FormEvent, useMemo, useState } from "react";
import { CreditCard, Search, UserRound, WalletCards } from "lucide-react";
import { SelectMenu } from "@/components/select-menu";
import {
  creditStatusLabels,
  type AdminCredit,
  type CreditStats,
  type PaymentMethod,
} from "@/lib/credits";

type CreditFilter = "ALL" | "ACTIVE" | "OVERDUE" | "PAID";

type Props = {
  initialCredits: AdminCredit[];
  initialStats: CreditStats;
};

const paymentOptions = [
  { label: "Efectivo", value: "CASH" },
  { label: "Transferencia", value: "TRANSFER" },
];

const filters: Array<{ label: string; value: CreditFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "Activos", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
  { label: "Pagados", value: "PAID" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

function MoneyInput({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      min="0"
      onChange={(event) => {
        const rawValue = event.target.value.replace(/\D/g, "");
        onChange(rawValue ? Number(rawValue) : 0);
      }}
      placeholder="Ej: 150.000"
      type="text"
      value={value > 0 ? value.toLocaleString("es-CO") : ""}
    />
  );
}

function calculateStats(credits: AdminCredit[], fallback: CreditStats): CreditStats {
  if (credits.length === 0 && fallback.total > 0) return fallback;

  return {
    total: credits.length,
    active: credits.filter((credit) => credit.status === "ACTIVE").length,
    overdue: credits.filter((credit) => credit.status === "OVERDUE").length,
    paid: credits.filter((credit) => credit.status === "PAID").length,
    totalBalance: credits.reduce((total, credit) => total + credit.balance, 0),
  };
}

export function AdminCreditsManager({ initialCredits, initialStats }: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const [selectedId, setSelectedId] = useState(initialCredits[0]?.id ?? "");
  const [filter, setFilter] = useState<CreditFilter>("ALL");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(
    () => calculateStats(credits, initialStats),
    [credits, initialStats],
  );

  const visibleCredits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");

    return credits.filter((credit) => {
      const matchesStatus = filter === "ALL" || credit.status === filter;
      const searchable = [
        credit.shortId,
        credit.saleShortId,
        credit.customerName,
        credit.customerDocument,
        credit.customerPhone,
        ...credit.items.flatMap((item) => [item.productName, item.productReference]),
      ]
        .join(" ")
        .toLocaleLowerCase("es");

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [credits, filter, query]);

  const selectedCredit =
    credits.find((credit) => credit.id === selectedId) ?? visibleCredits[0] ?? null;

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCredit) return;

    setError("");
    setMessage("");

    if (amount <= 0) {
      setError("Ingresa un valor mayor que cero.");
      return;
    }

    if (amount > selectedCredit.balance) {
      setError("El abono no puede superar el saldo pendiente.");
      return;
    }

    if (!method) {
      setError("Selecciona si el pago fue en efectivo o transferencia.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/credits/${selectedCredit.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, note, reference }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? result.message ?? "No fue posible registrar el abono.",
        );
      }

      const updatedCredit = result.credit as AdminCredit;
      setCredits((current) =>
        current.map((credit) => (credit.id === updatedCredit.id ? updatedCredit : credit)),
      );
      setSelectedId(updatedCredit.id);
      setAmount(0);
      setMethod("");
      setReference("");
      setNote("");
      setMessage(`Abono de ${formatMoney(result.payment.amount)} registrado correctamente.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible registrar el abono.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="creditsManager">
      <div className="creditStats" aria-label="Resumen de cartera">
        <article><span>Total créditos</span><strong>{stats.total}</strong></article>
        <article><span>Activos</span><strong>{stats.active}</strong></article>
        <article><span>En mora</span><strong>{stats.overdue}</strong></article>
        <article><span>Pagados</span><strong>{stats.paid}</strong></article>
        <article className="creditBalanceStat"><span>Saldo por cobrar</span><strong>{formatMoney(stats.totalBalance)}</strong></article>
      </div>

      <div className="creditToolbar">
        <label className="creditSearch">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Buscar crédito"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cliente, cédula, venta o producto"
            type="search"
            value={query}
          />
        </label>
        <div className="creditFilters" aria-label="Filtrar créditos">
          {filters.map((option) => (
            <button
              className={filter === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="creditsWorkspace">
        <aside className="creditList" aria-label="Créditos registrados">
          <div className="creditListHeading">
            <div>
              <span>Cartera registrada</span>
              <strong>{visibleCredits.length} resultado(s)</strong>
            </div>
          </div>

          {visibleCredits.length === 0 ? (
            <div className="creditEmpty">
              <WalletCards size={28} aria-hidden="true" />
              <strong>No hay créditos para mostrar</strong>
              <span>Prueba con otro término o estado.</span>
            </div>
          ) : (
            visibleCredits.map((credit) => (
              <button
                className={`creditListItem${selectedCredit?.id === credit.id ? " selected" : ""}`}
                key={credit.id}
                onClick={() => {
                  setSelectedId(credit.id);
                  setError("");
                  setMessage("");
                }}
                type="button"
              >
                <span className={`creditStatus creditStatus-${credit.status.toLowerCase()}`}>
                  {creditStatusLabels[credit.status]}
                </span>
                <strong>{credit.customerName}</strong>
                <span>CC {credit.customerDocument || "Sin documento"}</span>
                <span>{credit.saleTypeLabel} · Venta #{credit.saleShortId}</span>
                <b>{formatMoney(credit.balance)}</b>
              </button>
            ))
          )}
        </aside>

        <div className="creditDetail">
          {!selectedCredit ? (
            <div className="creditEmpty creditDetailEmpty">
              <CreditCard size={32} aria-hidden="true" />
              <strong>Selecciona un crédito</strong>
              <span>Aquí podrás revisar su deuda y registrar abonos.</span>
            </div>
          ) : (
            <>
              <div className="creditDetailHeader">
                <div>
                  <span>Crédito #{selectedCredit.shortId}</span>
                  <h2>{selectedCredit.customerName}</h2>
                  <p>
                    CC {selectedCredit.customerDocument || "Sin documento"} · {selectedCredit.customerPhone}
                  </p>
                </div>
                <span className={`creditStatus creditStatus-${selectedCredit.status.toLowerCase()}`}>
                  {selectedCredit.statusLabel}
                </span>
              </div>

              <div className="creditFigures">
                <article><span>Capital inicial</span><strong>{formatMoney(selectedCredit.principal)}</strong></article>
                <article><span>Interés acordado</span><strong>{selectedCredit.interestRate}%</strong></article>
                <article><span>Capital pendiente</span><strong>{formatMoney(selectedCredit.outstandingPrincipal)}</strong></article>
                <article><span>Interés pendiente</span><strong>{formatMoney(selectedCredit.interestBalance)}</strong></article>
                <article className="creditFigureBalance"><span>Saldo total</span><strong>{formatMoney(selectedCredit.balance)}</strong></article>
              </div>

              <div className="creditSaleSummary">
                <div>
                  <CreditCard size={19} aria-hidden="true" />
                  <strong>{selectedCredit.saleTypeLabel}</strong>
                  <span>{selectedCredit.months} mes(es) · Venta #{selectedCredit.saleShortId}</span>
                </div>
                <ul>
                  {selectedCredit.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.productName} × {item.quantity}</span>
                      <strong>{formatMoney(item.lineTotal)}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedCredit.status !== "PAID" && selectedCredit.status !== "CANCELLED" ? (
                <form className="creditPaymentForm" onSubmit={handlePayment}>
                  <div className="creditSectionTitle">
                    <WalletCards size={21} aria-hidden="true" />
                    <div><strong>Registrar abono</strong><span>El pago actualizará la deuda y el historial del cliente.</span></div>
                  </div>
                  <div className="creditPaymentFields">
                    <label htmlFor="credit-payment-amount">
                      Valor recibido
                      <MoneyInput id="credit-payment-amount" onChange={setAmount} value={amount} />
                    </label>
                    <label>
                      Medio de pago
                      <SelectMenu
                        onChange={(value) => setMethod(value as PaymentMethod)}
                        options={paymentOptions}
                        placeholder="Selecciona un medio"
                        value={method}
                      />
                    </label>
                    <label htmlFor="credit-payment-reference">
                      Comprobante
                      <input
                        id="credit-payment-reference"
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="Opcional"
                        value={reference}
                      />
                    </label>
                  </div>
                  <label htmlFor="credit-payment-note">
                    Observación
                    <textarea
                      id="credit-payment-note"
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Ej: Abono realizado por el cliente en el almacén."
                      rows={2}
                      value={note}
                    />
                  </label>
                  {error ? <p className="creditFormMessage error">{error}</p> : null}
                  {message ? <p className="creditFormMessage success">{message}</p> : null}
                  <div className="creditPaymentActions">
                    <span>Saldo actual: <strong>{formatMoney(selectedCredit.balance)}</strong></span>
                    <button disabled={saving} type="submit">
                      {saving ? "Guardando..." : "Registrar abono"}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="creditPayments">
                <div className="creditSectionTitle">
                  <UserRound size={21} aria-hidden="true" />
                  <div><strong>Historial de pagos</strong><span>{selectedCredit.payments.length} registro(s)</span></div>
                </div>
                {selectedCredit.payments.length === 0 ? (
                  <p className="creditNoPayments">Todavía no se han registrado abonos.</p>
                ) : (
                  <div className="creditPaymentList">
                    {selectedCredit.payments.map((payment) => (
                      <article key={payment.id}>
                        <div>
                          <strong>{formatMoney(payment.amount)}</strong>
                          <span>{payment.createdAt} · {payment.methodLabel}</span>
                        </div>
                        <div>
                          <span>Capital: {formatMoney(payment.principalAmount)}</span>
                          <span>Interés: {formatMoney(payment.interestAmount)}</span>
                        </div>
                        {payment.reference ? <span>Comprobante: {payment.reference}</span> : null}
                        {payment.note ? <p>{payment.note}</p> : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
