"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminCreditAccountCarousel } from "@/components/admin-credits/account-carousel";
import { AdminCreditDetail } from "@/components/admin-credits/credit-detail";
import { AdminCreditsCustomerWorkspace } from "@/components/admin-credits/customer-workspace";
import { AdminCreditManagementModals } from "@/components/admin-credits/management-modals";
import { AdminCreditsOverview, type CreditFilter } from "@/components/admin-credits/overview";
import { AdminCreditPaymentModal } from "@/components/admin-credits/payment-modal";
import {
  type AdminCredit,
  type CreditStats,
  type PaymentMethod,
} from "@/lib/credits";
import type { AdminCustomer } from "@/lib/customers";

type Props = {
  initialCredits: AdminCredit[];
  initialCustomers: AdminCustomer[];
  initialStats: CreditStats;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calculateStats(credits: AdminCredit[], fallback: CreditStats): CreditStats {
  if (!credits.length) {
    return {
      ...fallback,
      active: 0,
      overdue: 0,
      paid: 0,
      total: 0,
      totalBalance: 0,
    };
  }

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
  const [managementNoticeKey, setManagementNoticeKey] = useState(0);

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

  useEffect(() => {
    if (!managementNoticeKey) return;

    const timeout = window.setTimeout(() => setManagementNoticeKey(0), 4000);
    return () => window.clearTimeout(timeout);
  }, [managementNoticeKey]);

  function resetPaymentForm() {
    setAmount(0);
    setMethod("");
    setReference("");
    setNote("");
  }

  function clearFeedback() {
    setMessage("");
    setError("");
    setManagementNoticeKey(0);
  }

  function showManagementNotice() {
    setManagementNoticeKey((current) => current + 1);
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
      <AdminCreditsOverview
        disabled={saving}
        filter={filter}
        query={query}
        stats={stats}
        onFilterChange={(nextFilter) => {
          setFilter(nextFilter);
          clearFeedback();
        }}
        onQueryChange={setQuery}
      />

      {message ? <p className="creditFormMessage success">{message}</p> : null}
      {error && !paymentModalOpen ? <p className="creditFormMessage error">{error}</p> : null}

      <AdminCreditsCustomerWorkspace
        credits={credits}
        customerCredits={customerCredits}
        customers={visibleCustomers}
        disabled={saving}
        initialSearch={filter === "ALL" && !query.trim()}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={handleCustomerSelect}
      >
        <AdminCreditAccountCarousel
          credits={filteredCustomerCredits}
          disabled={saving}
          selectedId={selectedCredit?.id}
          onSelect={handleCreditSelect}
        />

        {selectedCredit ? (
          <AdminCreditDetail
            canManage={canManageSelectedCredit}
            credit={selectedCredit}
            managing={managingCredit}
            noticeVisible={Boolean(managementNoticeKey)}
            paymentDisabled={saving || managingCredit}
            onDelete={() => openCreditDelete(selectedCredit)}
            onEdit={() => openCreditEditor(selectedCredit)}
            onLockedAction={showManagementNotice}
            onPayment={openPaymentModal}
          />
        ) : null}
      </AdminCreditsCustomerWorkspace>

      {paymentModalOpen && selectedCredit ? (
        <AdminCreditPaymentModal
          amount={amount}
          credit={selectedCredit}
          error={error}
          method={method}
          note={note}
          reference={reference}
          saving={saving}
          onAmountChange={setAmount}
          onClose={closePaymentModal}
          onMethodChange={setMethod}
          onNoteChange={setNote}
          onReferenceChange={setReference}
          onSubmit={handlePayment}
        />
      ) : null}

      <AdminCreditManagementModals
        deleteConfirmation={deleteConfirmation}
        deleteCredit={creditToDelete}
        editCredit={creditToEdit}
        editInitialPayment={editInitialPayment}
        editInterestRate={editInterestRate}
        editMethod={editMethod}
        editMonths={editMonths}
        editStatus={editStatus}
        managing={managingCredit}
        onDeleteClose={() => setCreditToDelete(null)}
        onDeleteConfirmationChange={setDeleteConfirmation}
        onDeleteConfirm={deleteCredit}
        onEditClose={() => setCreditToEdit(null)}
        onEditInitialPaymentChange={setEditInitialPayment}
        onEditInterestRateChange={setEditInterestRate}
        onEditMethodChange={setEditMethod}
        onEditMonthsChange={setEditMonths}
        onEditStatusChange={setEditStatus}
        onEditSubmit={updateCredit}
      />

    </section>
  );
}
