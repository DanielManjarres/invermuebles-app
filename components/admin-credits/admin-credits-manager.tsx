"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminCreditAccountCarousel } from "@/components/admin-credits/account-carousel";
import { AdminCreditDetail } from "@/components/admin-credits/credit-detail";
import { AdminCreditsCustomerWorkspace } from "@/components/admin-credits/customer-workspace";
import { AdminCreditManagementModals } from "@/components/admin-credits/management-modals";
import { AdminCreditsOverview, type CreditFilter } from "@/components/admin-credits/overview";
import { AdminCreditPaymentModal } from "@/components/admin-credits/payment-modal";
import { AdminPaymentReceiptModal } from "@/components/admin-credits/payment-receipt-modal";
import { AdminSaleAccountDetail } from "@/components/admin-credits/sale-account-detail";
import { ExcelDownloadButton } from "@/components/admin-reports/excel-download-button";
import { downloadCreditsReport } from "@/lib/admin-report-builders";
import {
  type AdminCredit,
  type CreditStats,
  type PaymentMethod,
} from "@/lib/credits";
import type { AdminCustomer } from "@/lib/customers";
import { getBalanceAfterPayment } from "@/lib/payment-receipt";
import { buildPortfolioAccounts, type PortfolioAccountGroup } from "@/lib/portfolio";
import type { AdminSale } from "@/lib/sales";

type Props = {
  initialCredits: AdminCredit[];
  initialCustomers: AdminCustomer[];
  initialQuery?: string;
  initialSales: AdminSale[];
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calculateStats(accounts: ReturnType<typeof buildPortfolioAccounts>): CreditStats {
  return {
    total: accounts.length,
    active: accounts.filter((account) => account.status === "ACTIVE").length,
    overdue: accounts.filter((account) => account.status === "OVERDUE").length,
    paid: accounts.filter((account) => account.status === "PAID").length,
    totalBalance: accounts
      .filter((account) => account.status === "ACTIVE" || account.status === "OVERDUE")
      .reduce((sum, account) => sum + account.balance, 0),
  };
}

function getCustomerCredits(customerId: string, credits: AdminCredit[]) {
  return credits.filter((credit) => credit.customerId === customerId);
}

export function AdminCreditsManager({
  initialCredits,
  initialCustomers,
  initialQuery = "",
  initialSales,
}: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const [sales, setSales] = useState(initialSales);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [accountGroup, setAccountGroup] = useState<PortfolioAccountGroup>("OPEN");
  const [filter, setFilter] = useState<CreditFilter>("ALL");
  const [query, setQuery] = useState(initialQuery);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptSelection, setReceiptSelection] = useState<{
    accountId: string;
    paymentId: string;
  } | null>(null);
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

  const accounts = useMemo(() => buildPortfolioAccounts(credits, sales), [credits, sales]);
  const stats = useMemo(() => calculateStats(accounts), [accounts]);

  const visibleCustomers = useMemo(() => {
    const search = normalize(query.trim());

    if (filter === "ALL" && !search) {
      return [];
    }

    return initialCustomers.filter((customer) => {
      const customerCredits = getCustomerCredits(customer.id, credits);
      const customerAccounts = accounts.filter((account) => account.customerId === customer.id);
      const matchesStatus =
        filter === "ALL" || customerAccounts.some((account) => account.status === filter);

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
              credit.items.flatMap((item) => [
                item.productName,
                item.variantName,
                item.productReference,
                ...item.variantAttributes.map((attribute) => attribute.value),
              ]),
            )
            .join(" "),
          customerAccounts.map((account) => account.title).join(" "),
          customerAccounts.map((account) => account.shortId).join(" "),
          customerAccounts.map((account) => account.saleShortId).join(" "),
          customerAccounts
            .flatMap((account) =>
              account.items.flatMap((item) => [
                item.productName,
                item.variantName,
                item.productReference,
                ...item.variantAttributes.map((attribute) => attribute.value),
              ]),
            )
            .join(" "),
        ].join(" "),
      );

      return searchable.includes(search);
    });
  }, [accounts, credits, filter, initialCustomers, query]);

  const selectedCustomer =
    visibleCustomers.find((customer) => customer.id === selectedCustomerId) ?? null;

  const customerAccounts = selectedCustomer
    ? accounts.filter((account) => account.customerId === selectedCustomer.id)
    : [];
  const openAccounts = customerAccounts.filter((account) => account.status !== "PAID");
  const paidAccounts = customerAccounts.filter((account) => account.status === "PAID");
  const visibleAccountGroup =
    filter === "PAID" ? "PAID" : filter === "ALL" ? accountGroup : "OPEN";
  const groupedAccounts = visibleAccountGroup === "OPEN" ? openAccounts : paidAccounts;
  const filteredAccounts =
    filter === "ALL"
      ? groupedAccounts
      : groupedAccounts.filter((account) => account.status === filter);
  const selectedAccount = filteredAccounts.find((account) => account.id === selectedId) ?? null;
  const selectedCredit = selectedAccount?.credit ?? null;
  const receiptAccount = receiptSelection
    ? accounts.find((account) => account.id === receiptSelection.accountId) ?? null
    : null;
  const receiptPayment = receiptAccount && receiptSelection
    ? receiptAccount.payments.find((payment) => payment.id === receiptSelection.paymentId) ?? null
    : null;
  const receiptBalanceAfter = receiptAccount && receiptPayment
    ? getBalanceAfterPayment(receiptAccount.balance, receiptAccount.payments, receiptPayment.id)
    : 0;

  const visibleCustomerId = selectedCustomer?.id ?? "";
  const visibleCreditId = selectedAccount?.id ?? "";
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

    if (selectedId && selectedId !== visibleCreditId) {
      setSelectedId("");
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

    setSelectedCustomerId(customer.id);
    setSelectedId("");
    setAccountGroup("OPEN");
    resetPaymentForm();
    clearFeedback();
  }

  function handleCreditSelect(creditId: string) {
    if (saving) return;

    setSelectedId((current) => current === creditId ? "" : creditId);
    resetPaymentForm();
    clearFeedback();
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if (!selectedAccount) {
      setError("Selecciona una cuenta para registrar el abono.");
      return;
    }

    if (!amount || amount <= 0) {
      setError("Ingresa un valor de abono válido.");
      return;
    }

    if (amount > selectedAccount.balance) {
      setError("El abono no puede superar el saldo pendiente.");
      return;
    }

    if (!method) {
      setError("Selecciona el medio del abono.");
      return;
    }

    setSaving(true);

    try {
      const endpoint = selectedAccount.source === "CREDIT"
        ? `/api/credits/${selectedAccount.entityId}/payments`
        : `/api/sales/${selectedAccount.entityId}/payments`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method, reference, note }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo registrar el abono.");
      }

      if (selectedAccount.source === "CREDIT" && data.credit) {
        const previousPaymentIds = new Set(selectedAccount.payments.map((payment) => payment.id));
        const registeredPayment = data.credit.payments.find(
          (payment: { id: string }) => !previousPaymentIds.has(payment.id),
        );
        setCredits((current) =>
          current.map((credit) => (credit.id === data.credit.id ? data.credit : credit)),
        );
        if (registeredPayment) {
          setReceiptSelection({ accountId: selectedAccount.id, paymentId: registeredPayment.id });
        }
      } else if (selectedAccount.source === "SALE" && data.payment) {
        setSales((current) =>
          current.map((sale) =>
            sale.id === selectedAccount.entityId
              ? {
                  ...sale,
                  amountPaid: data.amountPaid,
                  balance: data.balance,
                  paymentMethod: method || sale.paymentMethod,
                  payments: [...sale.payments, data.payment],
                  status: data.status,
                }
              : sale,
          ),
        );
        setReceiptSelection({ accountId: selectedAccount.id, paymentId: data.payment.id });
      } else {
        throw new Error("No se pudo actualizar la cuenta después del abono.");
      }
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
      <div className="moduleReportActions">
        <ExcelDownloadButton
          disabled={credits.length === 0 && sales.length === 0}
          onDownload={() => downloadCreditsReport(credits, sales)}
        />
      </div>
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
        accounts={accounts}
        customerAccounts={customerAccounts}
        customers={visibleCustomers}
        disabled={saving}
        initialSearch={filter === "ALL" && !query.trim()}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={handleCustomerSelect}
      >
        <AdminCreditAccountCarousel
          accounts={filteredAccounts}
          activeGroup={visibleAccountGroup}
          disabled={saving}
          openCount={openAccounts.length}
          paidCount={paidAccounts.length}
          showGroups={filter === "ALL"}
          selectedId={selectedAccount?.id}
          onGroupChange={(group) => {
            setAccountGroup(group);
            setSelectedId("");
            clearFeedback();
          }}
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
            onReceipt={(paymentId) => setReceiptSelection({
              accountId: `credit:${selectedCredit.id}`,
              paymentId,
            })}
          />
        ) : null}

        {selectedAccount?.source === "SALE" ? (
          <AdminSaleAccountDetail
            account={selectedAccount}
            paymentDisabled={saving || managingCredit}
            onPayment={openPaymentModal}
            onReceipt={(paymentId) => setReceiptSelection({
              accountId: selectedAccount.id,
              paymentId,
            })}
          />
        ) : null}

        {!selectedAccount ? (
          <div className="creditDetailEmpty">
            <strong>Selecciona una cuenta</strong>
            <span>Haz clic en una tarjeta para ver sus detalles y pagos.</span>
          </div>
        ) : null}
      </AdminCreditsCustomerWorkspace>

      {paymentModalOpen && selectedAccount ? (
        <AdminCreditPaymentModal
          account={selectedAccount}
          amount={amount}
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

      {receiptAccount && receiptPayment ? (
        <AdminPaymentReceiptModal
          account={receiptAccount}
          balanceAfter={receiptBalanceAfter}
          payment={receiptPayment}
          onClose={() => setReceiptSelection(null)}
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
