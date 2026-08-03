"use client";

import { FormEvent, useMemo, useState } from "react";
import { CreditCard, Mail, MapPin, Phone, Search, UserRound, WalletCards } from "lucide-react";

import { SelectMenu } from "@/components/select-menu";
import {
  creditStatusLabels,
  type AdminCredit,
  type CreditStats,
  type PaymentMethod,
} from "@/lib/credits";
import { customerStatusLabels, type AdminCustomer } from "@/lib/customers";

type CreditFilter = "ALL" | "ACTIVE" | "OVERDUE" | "PAID" | "CANCELLED";
type CustomerCreditStatus = Exclude<CreditFilter, "ALL"> | "NONE";

type Props = {
  initialCredits: AdminCredit[];
  initialCustomers: AdminCustomer[];
  initialStats: CreditStats;
};

const paymentOptions: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Efectivo", value: "CASH" },
  { label: "Transferencia", value: "TRANSFER" },
];

const filters: Array<{ label: string; value: CreditFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "Activos", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
  { label: "Pagados", value: "PAID" },
  { label: "Cancelados", value: "CANCELLED" },
];

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function MoneyInput({
  id,
  onChange,
  value,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      pattern="[0-9.]*"
      type="text"
      value={value ? new Intl.NumberFormat("es-CO").format(value) : ""}
      onChange={(event) => {
        const numericValue = Number(event.target.value.replace(/\D/g, ""));
        onChange(Number.isFinite(numericValue) ? numericValue : 0);
      }}
      placeholder="Ej: 100.000"
    />
  );
}

function calculateStats(credits: AdminCredit[], fallback: CreditStats): CreditStats {
  if (!credits.length) return fallback;

  return {
    total: credits.length,
    active: credits.filter((credit) => credit.status === "ACTIVE").length,
    overdue: credits.filter((credit) => credit.status === "OVERDUE").length,
    paid: credits.filter((credit) => credit.status === "PAID").length,
    totalBalance: credits
      .filter((credit) => credit.status === "ACTIVE" || credit.status === "OVERDUE")
      .reduce((sum, credit) => sum + credit.balance, 0),
  };
}

function getCustomerCredits(customerId: string, credits: AdminCredit[]) {
  return credits.filter((credit) => credit.customerId === customerId);
}

function getCustomerBalance(customerCredits: AdminCredit[]) {
  return customerCredits
    .filter((credit) => credit.status === "ACTIVE" || credit.status === "OVERDUE")
    .reduce((sum, credit) => sum + credit.balance, 0);
}

function getCustomerCreditStatus(customerCredits: AdminCredit[]): CustomerCreditStatus {
  if (customerCredits.some((credit) => credit.status === "OVERDUE")) return "OVERDUE";
  if (customerCredits.some((credit) => credit.status === "ACTIVE")) return "ACTIVE";
  if (customerCredits.some((credit) => credit.status === "PAID")) return "PAID";
  if (customerCredits.some((credit) => credit.status === "CANCELLED")) return "CANCELLED";
  return "NONE";
}

function getCustomerCreditStatusLabel(status: CustomerCreditStatus) {
  if (status === "NONE") return "Sin cartera";
  return creditStatusLabels[status];
}

function getCustomerCreditStatusClass(status: CustomerCreditStatus) {
  if (status === "NONE") return "creditStatus-cancelled";
  return `creditStatus-${status.toLowerCase()}`;
}

export function AdminCreditsManager({ initialCredits, initialCustomers, initialStats }: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomers[0]?.id ?? initialCredits[0]?.customerId ?? "",
  );
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

  const stats = useMemo(() => calculateStats(credits, initialStats), [credits, initialStats]);

  const visibleCustomers = useMemo(() => {
    const search = normalize(query.trim());

    return initialCustomers.filter((customer) => {
      const customerCredits = getCustomerCredits(customer.id, credits);
      const matchesStatus =
        filter === "ALL" || customerCredits.some((credit) => credit.status === filter);

      if (!matchesStatus) return false;
      if (!search) return true;

      const searchable = normalize(
        [
          customer.fullName,
          customer.document,
          customer.phone,
          customer.email,
          customer.city,
          customerCredits.map((credit) => credit.shortId).join(" "),
          customerCredits.map((credit) => credit.saleShortId).join(" "),
          customerCredits
            .flatMap((credit) =>
              credit.items.flatMap((item) => [item.productName, item.productReference]),
            )
            .join(" "),
        ].join(" "),
      );

      return searchable.includes(search);
    });
  }, [credits, filter, initialCustomers, query]);

  const selectedCustomer =
    visibleCustomers.find((customer) => customer.id === selectedCustomerId) ??
    visibleCustomers[0] ??
    null;

  const customerCredits = selectedCustomer ? getCustomerCredits(selectedCustomer.id, credits) : [];
  const selectedCredit =
    customerCredits.find((credit) => credit.id === selectedId) ?? customerCredits[0] ?? null;

  function resetPaymentForm() {
    setAmount(0);
    setMethod("");
    setReference("");
    setNote("");
  }

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function handleCustomerSelect(customer: AdminCustomer) {
    const customerCredits = getCustomerCredits(customer.id, credits);
    setSelectedCustomerId(customer.id);
    setSelectedId(customerCredits[0]?.id ?? "");
    resetPaymentForm();
    clearFeedback();
  }

  function handleCreditSelect(creditId: string) {
    setSelectedId(creditId);
    resetPaymentForm();
    clearFeedback();
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!selectedCredit) {
      setError("Selecciona una cuenta para registrar el abono.");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Ingresa un valor de abono valido.");
      return;
    }

    if (amount > selectedCredit.balance) {
      setError("El abono no puede superar el saldo pendiente.");
      return;
    }

    if (!method) {
      setError("Selecciona el medio del abono.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/credits/${selectedCredit.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, reference, note }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo registrar el abono.");
      }

      setCredits((current) =>
        current.map((credit) => (credit.id === data.credit.id ? data.credit : credit)),
      );
      setSelectedId(data.credit.id);
      resetPaymentForm();
      setMessage("Abono registrado correctamente.");
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo registrar el abono.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="creditsManager">
      <div className="creditStats">
        <article>
          <span>Total creditos</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Activos</span>
          <strong>{stats.active}</strong>
        </article>
        <article>
          <span>En mora</span>
          <strong>{stats.overdue}</strong>
        </article>
        <article>
          <span>Saldo por cobrar</span>
          <strong>{formatMoney(stats.totalBalance)}</strong>
        </article>
      </div>

      <div className="creditToolbar">
        <label className="searchBox" htmlFor="credit-search">
          <Search size={22} />
          <input
            id="credit-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cliente, cedula, telefono, venta o producto"
          />
        </label>

        <div className="filterChips" aria-label="Filtrar cartera">
          {filters.map((option) => (
            <button
              className={filter === option.value ? "active" : ""}
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                clearFeedback();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="formMessage success">{message}</p> : null}
      {error ? <p className="formMessage error">{error}</p> : null}

      <div className="creditsWorkspace">
        <aside className="creditList" aria-label="Clientes con cartera">
          <div className="creditListHeading">
            <span>Clientes encontrados</span>
            <strong>{visibleCustomers.length} resultado(s)</strong>
          </div>

          {!visibleCustomers.length ? (
            <div className="creditEmpty">
              <WalletCards size={30} />
              <strong>No hay clientes para mostrar</strong>
              <span>Cambia la busqueda o el filtro para revisar otras cuentas.</span>
            </div>
          ) : (
            visibleCustomers.map((customer) => {
              const listCredits = getCustomerCredits(customer.id, credits);
              const status = getCustomerCreditStatus(listCredits);
              const balance = getCustomerBalance(listCredits);

              return (
                <button
                  className={`creditListItem creditCustomerItem${
                    selectedCustomer?.id === customer.id ? " selected" : ""
                  }`}
                  key={customer.id}
                  type="button"
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="creditCustomerTop">
                    <span className={`creditStatus ${getCustomerCreditStatusClass(status)}`}>
                      {getCustomerCreditStatusLabel(status)}
                    </span>
                    <span>{listCredits.length} cuenta(s)</span>
                  </div>
                  <strong>{customer.fullName}</strong>
                  <span>CC {customer.document}</span>
                  <span>
                    {customer.phone || "Sin telefono"} · {customer.city || "Sin ciudad"}
                  </span>
                  <b>{formatMoney(balance)}</b>
                </button>
              );
            })
          )}
        </aside>

        <div className="creditDetail">
          {!selectedCustomer ? (
            <div className="creditEmpty">
              <UserRound size={34} />
              <strong>Selecciona un cliente</strong>
              <span>Desde aqui podras ver sus creditos, saldos y pagos registrados.</span>
            </div>
          ) : (
            <>
              <div className="creditCustomerProfile">
                <div className="creditCustomerProfileHeader">
                  <div>
                    <span>Perfil de cartera</span>
                    <h2>{selectedCustomer.fullName}</h2>
                    <p>
                      CC {selectedCustomer.document} · {selectedCustomer.phone || "Sin telefono"}
                    </p>
                  </div>
                  <span className="creditStatus creditStatus-active">
                    {customerStatusLabels[selectedCustomer.status]}
                  </span>
                </div>

                <div className="creditCustomerInfoGrid">
                  <div className="creditCustomerInfoCard">
                    <Phone size={18} />
                    <span>Telefono</span>
                    <strong>{selectedCustomer.phone || "Sin registrar"}</strong>
                  </div>
                  <div className="creditCustomerInfoCard">
                    <Mail size={18} />
                    <span>Correo</span>
                    <strong>{selectedCustomer.email || "Sin registrar"}</strong>
                  </div>
                  <div className="creditCustomerInfoCard">
                    <MapPin size={18} />
                    <span>Ciudad</span>
                    <strong>{selectedCustomer.city || "Sin registrar"}</strong>
                  </div>
                  <div className="creditCustomerInfoCard">
                    <WalletCards size={18} />
                    <span>Saldo cartera</span>
                    <strong>{formatMoney(getCustomerBalance(customerCredits))}</strong>
                  </div>
                </div>
              </div>

              {!customerCredits.length ? (
                <div className="creditEmpty">
                  <CreditCard size={34} />
                  <strong>Este cliente no tiene creditos registrados</strong>
                  <span>Cuando una venta genere cartera, aparecera en este perfil.</span>
                </div>
              ) : (
                <>
                  <div className="creditAccounts">
                    <div className="creditAccountsHeader">
                      <strong>Cuentas del cliente</strong>
                      <span>Selecciona una cuenta para revisar saldos y registrar abonos.</span>
                    </div>

                    <div className="creditAccountList">
                      {customerCredits.map((credit) => (
                        <button
                          className={`creditAccountButton${
                            selectedCredit?.id === credit.id ? " selected" : ""
                          }`}
                          key={credit.id}
                          type="button"
                          onClick={() => handleCreditSelect(credit.id)}
                        >
                          <div className="creditAccountTop">
                            <strong>Credito #{credit.shortId}</strong>
                            <span className={`creditStatus creditStatus-${credit.status.toLowerCase()}`}>
                              {credit.statusLabel}
                            </span>
                          </div>
                          <span className="creditAccountMeta">
                            {credit.saleTypeLabel} · Venta #{credit.saleShortId}
                          </span>
                          <span className="creditAccountAmount">{formatMoney(credit.balance)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCredit ? (
                    <div className="creditSelectedAccount">
                      <div className="creditDetailHeader">
                        <div>
                          <span className="sectionEyebrow">Cuenta #{selectedCredit.shortId}</span>
                          <h3>{selectedCredit.saleTypeLabel}</h3>
                          <p>
                            Venta #{selectedCredit.saleShortId} · {selectedCredit.months} mes(es) ·{" "}
                            {selectedCredit.interestRate}% interes
                          </p>
                        </div>
                        <span className={`creditStatus creditStatus-${selectedCredit.status.toLowerCase()}`}>
                          {selectedCredit.statusLabel}
                        </span>
                      </div>

                      {selectedCredit.status === "CANCELLED" ? (
                        <p className="formMessage error">
                          Esta cuenta fue cancelada. No se pueden registrar abonos nuevos.
                        </p>
                      ) : null}

                      <div className="creditFigures">
                        <article>
                          <span>Capital inicial</span>
                          <strong>{formatMoney(selectedCredit.principal)}</strong>
                        </article>
                        <article>
                          <span>Interes acordado</span>
                          <strong>{selectedCredit.interestRate}%</strong>
                        </article>
                        <article>
                          <span>Capital pendiente</span>
                          <strong>{formatMoney(selectedCredit.outstandingPrincipal)}</strong>
                        </article>
                        <article>
                          <span>Interes pendiente</span>
                          <strong>{formatMoney(selectedCredit.interestBalance)}</strong>
                        </article>
                        <article>
                          <span>Saldo total</span>
                          <strong>{formatMoney(selectedCredit.balance)}</strong>
                        </article>
                      </div>

                      <div className="creditSaleSummary">
                        <strong>
                          {selectedCredit.saleTypeLabel} · Venta #{selectedCredit.saleShortId}
                        </strong>
                        {selectedCredit.items.map((item) => (
                          <div key={item.id}>
                            <span>
                              {item.productName} x {item.quantity}
                            </span>
                  <b>{formatMoney(item.lineTotal)}</b>
                          </div>
                        ))}
                      </div>

                      {selectedCredit.status !== "PAID" && selectedCredit.status !== "CANCELLED" ? (
                        <form className="creditPaymentForm" onSubmit={handlePayment}>
                          <div className="formSectionTitle">
                            <span>Registrar abono</span>
                            <strong>El pago baja primero capital y luego interes pendiente.</strong>
                          </div>

                          <label>
                            Valor recibido
                            <MoneyInput id="payment-amount" value={amount} onChange={setAmount} />
                          </label>

                          <label>
                            Medio
                            <SelectMenu
                              options={paymentOptions}
                              placeholder="Selecciona medio"
                              value={method}
                              onChange={(value) => setMethod(value as PaymentMethod)}
                            />
                          </label>

                          <label>
                            Comprobante
                            <input
                              type="text"
                              value={reference}
                              onChange={(event) => setReference(event.target.value)}
                              placeholder="Opcional"
                            />
                          </label>

                          <label className="fullWidth">
                            Observacion
                            <textarea
                              value={note}
                              onChange={(event) => setNote(event.target.value)}
                              placeholder="Ej: abono a capital, pago mensual, transferencia confirmada."
                            />
                          </label>

                          <button className="primaryButton" disabled={saving} type="submit">
                            <WalletCards size={20} />
                            {saving ? "Guardando..." : "Registrar abono"}
                          </button>
                        </form>
                      ) : null}

                      <div className="creditPayments">
                        <div>
                          <UserRound size={24} />
                          <div>
                            <h3>Historial de pagos</h3>
                            <p>{selectedCredit.payments.length} registro(s)</p>
                          </div>
                        </div>

                        {!selectedCredit.payments.length ? (
                          <p className="emptyNote">Todavia no se han registrado abonos.</p>
                        ) : (
                          selectedCredit.payments.map((payment) => (
                            <article key={payment.id}>
                              <div>
                                <strong>{formatMoney(payment.amount)}</strong>
                                <span>
                                  {payment.createdAt} · {payment.methodLabel}
                                </span>
                              </div>
                              <div>
                                <span>Capital: {formatMoney(payment.principalAmount)}</span>
                                <span>Interes: {formatMoney(payment.interestAmount)}</span>
                              </div>
                              {payment.reference ? <small>Comprobante: {payment.reference}</small> : null}
                              {payment.note ? <small>{payment.note}</small> : null}
                            </article>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
