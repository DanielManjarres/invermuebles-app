"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Mail, MapPin, Pencil, Phone, Search, Trash2, UserRound, WalletCards } from "lucide-react";

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
];

const editableStatusOptions = [
  { label: "Activo", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
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
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<CreditFilter>("ALL");
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditToEdit, setCreditToEdit] = useState<AdminCredit | null>(null);
  const [creditToDelete, setCreditToDelete] = useState<AdminCredit | null>(null);
  const [editMonths, setEditMonths] = useState(6);
  const [editInterestRate, setEditInterestRate] = useState(0);
  const [editInitialPayment, setEditInitialPayment] = useState(0);
  const [editMethod, setEditMethod] = useState<PaymentMethod | "">("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "OVERDUE">("ACTIVE");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [managingCredit, setManagingCredit] = useState(false);

  const stats = useMemo(() => calculateStats(credits, initialStats), [credits, initialStats]);

  const visibleCustomers = useMemo(() => {
    const search = normalize(query.trim());

    if (filter === "ALL" && !search) {
      return [];
    }

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
    visibleCustomers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const customerCredits = selectedCustomer ? getCustomerCredits(selectedCustomer.id, credits) : [];
  const filteredCustomerCredits =
    filter === "ALL"
      ? customerCredits
      : customerCredits.filter((credit) => credit.status === filter);
  const selectedCredit =
    filteredCustomerCredits.find((credit) => credit.id === selectedId) ??
    filteredCustomerCredits[0] ??
    null;

  const visibleCustomerId = selectedCustomer?.id ?? "";
  const visibleCreditId = selectedCredit?.id ?? "";
  const canManageSelectedCredit = Boolean(
    selectedCredit &&
      (selectedCredit.status === "ACTIVE" || selectedCredit.status === "OVERDUE") &&
      !selectedCredit.payments.some((payment) => !payment.isInitial),
  );

  useEffect(() => {
    if (saving) return;

    if (selectedCustomerId !== visibleCustomerId) {
      setSelectedCustomerId(visibleCustomerId);
    }

    if (selectedId !== visibleCreditId) {
      setSelectedId(visibleCreditId);
    }
  }, [saving, selectedCustomerId, selectedId, visibleCreditId, visibleCustomerId]);

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
    if (saving) return;

    const customerCredits = getCustomerCredits(customer.id, credits);
    const filteredCredits =
      filter === "ALL"
        ? customerCredits
        : customerCredits.filter((credit) => credit.status === filter);
    setSelectedCustomerId(customer.id);
    setSelectedId(filteredCredits[0]?.id ?? "");
    resetPaymentForm();
    clearFeedback();
  }

  function handleCreditSelect(creditId: string) {
    if (saving) return;

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
      setError("Ingresa un valor de abono válido.");
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
      setPaymentModalOpen(false);
      setMessage("Abono registrado correctamente.");
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo registrar el abono.");
    } finally {
      setSaving(false);
    }
  }

  function openPaymentModal() {
    resetPaymentForm();
    clearFeedback();
    setPaymentModalOpen(true);
  }

  function closePaymentModal() {
    if (saving) return;
    resetPaymentForm();
    setPaymentModalOpen(false);
  }

  function openCreditEditor(credit: AdminCredit) {
    const initialPayment = credit.payments.find((payment) => payment.isInitial);
    setCreditToEdit(credit);
    setEditMonths(credit.months);
    setEditInterestRate(credit.interestRate);
    setEditInitialPayment(initialPayment?.amount ?? 0);
    setEditMethod(initialPayment?.method ?? "");
    setEditStatus(credit.status === "OVERDUE" ? "OVERDUE" : "ACTIVE");
    clearFeedback();
  }

  async function updateCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creditToEdit || managingCredit) return;

    setManagingCredit(true);
    clearFeedback();

    try {
      const response = await fetch(`/api/credits/${creditToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialPayment: editInitialPayment,
          interestRate: editInterestRate,
          method: editMethod || undefined,
          months: editMonths,
          status: editStatus,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "No se pudo actualizar el crédito.");
      }

      setCredits((current) =>
        current.map((credit) => (credit.id === result.credit.id ? result.credit : credit)),
      );
      setCreditToEdit(null);
      setMessage(result.message ?? "Crédito actualizado correctamente.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el crédito.");
    } finally {
      setManagingCredit(false);
    }
  }

  function openCreditDelete(credit: AdminCredit) {
    setCreditToDelete(credit);
    setDeleteConfirmation("");
    clearFeedback();
  }

  async function deleteCredit() {
    if (!creditToDelete || managingCredit || deleteConfirmation !== "ELIMINAR") return;

    setManagingCredit(true);
    clearFeedback();

    try {
      const response = await fetch(`/api/credits/${creditToDelete.id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "No se pudo eliminar el crédito.");
      }

      setCredits((current) => current.filter((credit) => credit.id !== creditToDelete.id));
      setCreditToDelete(null);
      setDeleteConfirmation("");
      setMessage(result.message ?? "Crédito eliminado correctamente.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el crédito.");
    } finally {
      setManagingCredit(false);
    }
  }

  return (
    <section className="creditsManager">
      <div className="creditStats">
        <article>
          <span>Total créditos</span>
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
        <label className="creditSearch" htmlFor="credit-search">
          <Search size={22} />
          <input
            id="credit-search"
            type="search"
            disabled={saving}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cliente, cédula, teléfono, venta o producto"
          />
        </label>

        <div className="creditFilters" aria-label="Filtrar cartera">
          {filters.map((option) => (
            <button
              className={filter === option.value ? "active" : ""}
              key={option.value}
              type="button"
              disabled={saving}
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

      {message ? <p className="creditFormMessage success">{message}</p> : null}
      {error ? <p className="creditFormMessage error">{error}</p> : null}

      <div className="creditsWorkspace">
        <aside className="creditList" aria-label="Clientes con cartera">
          <div className="creditListHeading">
            <span>Clientes encontrados</span>
            <strong>{visibleCustomers.length} resultado(s)</strong>
          </div>

          {!visibleCustomers.length ? (
            <div className="creditEmpty">
              <WalletCards size={30} />
              <strong>
                {filter === "ALL" && !query.trim()
                  ? "Busca un cliente para comenzar"
                  : "No hay clientes para mostrar"}
              </strong>
              <span>
                {filter === "ALL" && !query.trim()
                  ? "Escribe su nombre, cédula, teléfono, venta o producto."
                  : "Cambia la búsqueda o el filtro para revisar otras cuentas."}
              </span>
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
                  disabled={saving}
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
                    {customer.phone || "Sin teléfono"} · {customer.city || "Sin ciudad"}
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
              <span>Desde aquí podrás ver sus créditos, saldos y pagos registrados.</span>
            </div>
          ) : (
            <>
              <div className="creditCustomerProfile">
                <div className="creditCustomerProfileHeader">
                  <div>
                    <span>Perfil de cartera</span>
                    <h2>{selectedCustomer.fullName}</h2>
                    <p>
                      CC {selectedCustomer.document} · {selectedCustomer.phone || "Sin teléfono"}
                    </p>
                  </div>
                  <span className={`customerStatus ${selectedCustomer.status.toLowerCase()}`}>
                    {customerStatusLabels[selectedCustomer.status]}
                  </span>
                </div>

                <div className="creditCustomerInfoGrid">
                  <div className="creditCustomerInfoCard">
                    <Phone size={18} />
                    <span>Teléfono</span>
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
                  <strong>Este cliente no tiene créditos registrados</strong>
                  <span>Cuando una venta genere cartera, aparecerá en este perfil.</span>
                </div>
              ) : (
                <>
                  <div className="creditAccounts">
                    <div className="creditAccountsHeader">
                      <strong>Cuentas del cliente</strong>
                      <span>Selecciona una cuenta para revisar saldos y registrar abonos.</span>
                    </div>

                    <div className="creditAccountList">
                      {filteredCustomerCredits.map((credit) => (
                        <button
                          className={`creditAccountButton${
                            selectedCredit?.id === credit.id ? " selected" : ""
                          }`}
                          key={credit.id}
                          type="button"
                          disabled={saving}
                          onClick={() => handleCreditSelect(credit.id)}
                        >
                          <div className="creditAccountTop">
                            <strong>Crédito #{credit.shortId}</strong>
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
                            {selectedCredit.interestRate}% interés
                          </p>
                        </div>
                        <div className="creditHeaderActions">
                          <span className={`creditStatus creditStatus-${selectedCredit.status.toLowerCase()}`}>
                            {selectedCredit.statusLabel}
                          </span>
                          {selectedCredit.status === "ACTIVE" || selectedCredit.status === "OVERDUE" ? (
                            <button
                              className="primaryButton"
                              disabled={saving || managingCredit}
                              type="button"
                              onClick={openPaymentModal}
                            >
                              <WalletCards size={16} />
                              Registrar abono
                            </button>
                          ) : null}
                          <button
                            className="secondaryButton"
                            disabled={!canManageSelectedCredit || managingCredit}
                            type="button"
                            onClick={() => openCreditEditor(selectedCredit)}
                          >
                            <Pencil size={16} />
                            Editar crédito
                          </button>
                          <button
                            className="dangerButton"
                            disabled={!canManageSelectedCredit || managingCredit}
                            type="button"
                            onClick={() => openCreditDelete(selectedCredit)}
                          >
                            <Trash2 size={16} />
                            Eliminar crédito
                          </button>
                        </div>
                      </div>

                      {!canManageSelectedCredit ? (
                        <p className="creditFormMessage error">
                          Este crédito conserva abonos posteriores o un estado final y no permite editar ni eliminar su financiación.
                        </p>
                      ) : null}

                      {selectedCredit.status === "CANCELLED" ? (
                        <p className="creditFormMessage error">
                          Esta cuenta fue cancelada. No se pueden registrar abonos nuevos.
                        </p>
                      ) : null}

                      <div className="creditFigures">
                        <article>
                          <span>Capital inicial</span>
                          <strong>{formatMoney(selectedCredit.principal)}</strong>
                        </article>
                        <article>
                          <span>Interés acordado</span>
                          <strong>{selectedCredit.interestRate}%</strong>
                        </article>
                        <article>
                          <span>Capital pendiente</span>
                          <strong>{formatMoney(selectedCredit.outstandingPrincipal)}</strong>
                        </article>
                        <article>
                          <span>Interés pendiente</span>
                          <strong>{formatMoney(selectedCredit.interestBalance)}</strong>
                        </article>
                        <article className="creditFigureBalance">
                          <span>Saldo total</span>
                          <strong>{formatMoney(selectedCredit.balance)}</strong>
                        </article>
                      </div>

                      <div className="creditSaleSummary">
                        <div>
                          <strong>
                            {selectedCredit.saleTypeLabel} · Venta #{selectedCredit.saleShortId}
                          </strong>
                        </div>
                        <ul>
                          {selectedCredit.items.map((item) => (
                            <li key={item.id}>
                              <span>
                                {item.productName} x {item.quantity}
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
                            <p>{selectedCredit.payments.length} registro(s)</p>
                          </div>
                        </div>

                        {!selectedCredit.payments.length ? (
                          <p className="creditNoPayments">Todavía no se han registrado abonos.</p>
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
                                <span>Interés: {formatMoney(payment.interestAmount)}</span>
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

      {paymentModalOpen && selectedCredit ? (
        <div className="adminModalBackdrop" role="presentation">
          <form
            aria-labelledby="payment-modal-title"
            aria-modal="true"
            className="adminModal creditPaymentModal"
            role="dialog"
            onSubmit={handlePayment}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Crédito #{selectedCredit.shortId}</p>
                <h2 id="payment-modal-title">Registrar abono</h2>
              </div>
              <button className="iconButton" disabled={saving} type="button" onClick={closePaymentModal}>
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="recordDeleteTarget">
              <span>Cuenta seleccionada</span>
              <strong>{selectedCredit.customerName}</strong>
              <small>
                Venta #{selectedCredit.saleShortId} · Saldo disponible {formatMoney(selectedCredit.balance)}
              </small>
            </div>

            {error ? <p className="creditFormMessage error">{error}</p> : null}

            <div className="creditPaymentFields">
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
            </div>

            <label>
              Observación
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ej: abono a capital, pago mensual, transferencia confirmada."
              />
            </label>

            <p className="creditPaymentHint">
              El pago se distribuirá entre capital e interés según el saldo pendiente.
            </p>

            <div className="modalActions">
              <button className="secondaryButton" disabled={saving} type="button" onClick={closePaymentModal}>
                Cancelar
              </button>
              <button className="primaryButton" disabled={saving} type="submit">
                <WalletCards size={18} />
                {saving ? "Guardando..." : "Registrar abono"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {creditToEdit ? (
        <div className="adminModalBackdrop" role="presentation">
          <form
            aria-labelledby="edit-credit-title"
            aria-modal="true"
            className="adminModal"
            role="dialog"
            onSubmit={updateCredit}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Corrección administrativa</p>
                <h2 id="edit-credit-title">Editar crédito #{creditToEdit.shortId}</h2>
              </div>
              <button className="iconButton" disabled={managingCredit} type="button" onClick={() => setCreditToEdit(null)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="recordDeleteWarning">
              Solo se permite corregir la financiación mientras no existan abonos posteriores al pago inicial.
            </div>

            <div className="adminFormGrid">
              <label>
                Plazo en meses
                <input
                  min="1"
                  max="120"
                  type="number"
                  value={editMonths}
                  onChange={(event) => setEditMonths(Number(event.target.value))}
                />
              </label>
              <label>
                Interés (%)
                <input
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  value={editInterestRate}
                  onChange={(event) => setEditInterestRate(Number(event.target.value))}
                />
              </label>
              <label>
                Pago inicial
                <MoneyInput id="edit-initial-payment" value={editInitialPayment} onChange={setEditInitialPayment} />
              </label>
              <label>
                Medio del pago inicial
                <SelectMenu
                  disabled={!editInitialPayment}
                  options={paymentOptions}
                  placeholder="Sin pago inicial"
                  value={editMethod}
                  onChange={(value) => setEditMethod(value as PaymentMethod)}
                />
              </label>
              <label>
                Estado
                <SelectMenu
                  options={editableStatusOptions}
                  placeholder="Selecciona estado"
                  value={editStatus}
                  onChange={(value) => setEditStatus(value as "ACTIVE" | "OVERDUE")}
                />
              </label>
            </div>

            <div className="modalActions">
              <button className="secondaryButton" disabled={managingCredit} type="button" onClick={() => setCreditToEdit(null)}>
                Cancelar
              </button>
              <button className="primaryButton" disabled={managingCredit} type="submit">
                {managingCredit ? "Guardando..." : "Guardar corrección"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {creditToDelete ? (
        <div className="adminModalBackdrop" role="presentation">
          <div aria-labelledby="delete-credit-title" aria-modal="true" className="adminModal recordDeleteModal" role="dialog">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2 id="delete-credit-title">Eliminar crédito</h2>
              </div>
              <button className="iconButton" disabled={managingCredit} type="button" onClick={() => setCreditToDelete(null)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="recordDeleteWarning">
              El crédito y su pago inicial se eliminarán permanentemente. La venta se conservará pendiente para configurar otra financiación.
            </div>
            <div className="recordDeleteTarget">
              <span>Crédito seleccionado</span>
              <strong>Crédito #{creditToDelete.shortId}</strong>
              <small>Venta #{creditToDelete.saleShortId} · {creditToDelete.customerName}</small>
            </div>
            <label className="deleteConfirmationField">
              Escribe ELIMINAR para confirmar
              <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
            </label>
            <div className="modalActions">
              <button className="secondaryButton" disabled={managingCredit} type="button" onClick={() => setCreditToDelete(null)}>
                Cancelar
              </button>
              <button className="dangerButton" disabled={managingCredit || deleteConfirmation !== "ELIMINAR"} type="button" onClick={deleteCredit}>
                <Trash2 size={17} />
                {managingCredit ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
