"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PortfolioAccount, PortfolioAccountGroup } from "@/lib/portfolio";

type Props = {
  accounts: PortfolioAccount[];
  activeGroup: PortfolioAccountGroup;
  disabled: boolean;
  openCount: number;
  paidCount: number;
  showGroups: boolean;
  onGroupChange: (group: PortfolioAccountGroup) => void;
  onSelect: (accountId: string) => void;
  selectedId?: string;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

function getProductSummary(account: PortfolioAccount) {
  const firstItem = account.items[0];
  if (!firstItem) return "Sin productos registrados";
  if (account.items.length === 1) return firstItem.productName;
  return `${firstItem.productName} y ${account.items.length - 1} producto(s) más`;
}

function getSaleDate(account: PortfolioAccount) {
  return account.createdAt.split(",")[0];
}

export function AdminCreditAccountCarousel({
  accounts,
  activeGroup,
  disabled,
  openCount,
  paidCount,
  showGroups,
  onGroupChange,
  onSelect,
  selectedId,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  function scrollAccounts(left: number) {
    listRef.current?.scrollBy({ left, behavior: "smooth" });
  }

  return (
    <div className="creditAccounts">
      <div className="creditAccountsHeader">
        <div>
          <strong>Cuentas del cliente</strong>
          <span>Selecciona una cuenta para revisar sus detalles y pagos.</span>
        </div>
        {accounts.length > 1 ? (
          <div className="creditAccountControls" aria-label="Desplazar cuentas" role="group">
            <button
              aria-label="Ver cuentas anteriores"
              type="button"
              onClick={() => scrollAccounts(-290)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Ver cuentas siguientes"
              type="button"
              onClick={() => scrollAccounts(290)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}
      </div>

      {showGroups ? (
        <div className="creditAccountTabs" aria-label="Tipo de cuentas" role="tablist">
          <button
            className={activeGroup === "OPEN" ? "active" : ""}
            disabled={disabled}
            type="button"
            onClick={() => onGroupChange("OPEN")}
          >
            Por cobrar ({openCount})
          </button>
          <button
            className={activeGroup === "PAID" ? "active" : ""}
            disabled={disabled}
            type="button"
            onClick={() => onGroupChange("PAID")}
          >
            Pagadas ({paidCount})
          </button>
        </div>
      ) : null}

      <div className="creditAccountList" ref={listRef}>
        {!accounts.length ? (
          <p className="creditAccountEmpty">
            No hay cuentas {activeGroup === "OPEN" ? "por cobrar" : "pagadas"} para mostrar.
          </p>
        ) : null}
        {accounts.map((account) => (
          <button
            className={`creditAccountButton${selectedId === account.id ? " selected" : ""}`}
            key={account.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(account.id)}
          >
            <div className="creditAccountTop">
              <strong>{account.title}</strong>
              <span className={`creditStatus creditStatus-${account.status.toLowerCase()}`}>
                {account.statusLabel}
              </span>
            </div>
            <span className="creditAccountProduct">{getProductSummary(account)}</span>
            <span className="creditAccountMeta">Venta del {getSaleDate(account)}</span>
            <span className="creditAccountAmount">
              {account.status === "PAID"
                ? `Total pagado: ${formatMoney(account.amountPaid)}`
                : `Saldo: ${formatMoney(account.balance)}`}
            </span>
            <small>Venta #{account.saleShortId} · Cuenta #{account.shortId}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
