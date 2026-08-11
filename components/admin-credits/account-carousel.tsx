"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AdminCredit } from "@/lib/credits";

type Props = {
  credits: AdminCredit[];
  disabled: boolean;
  onSelect: (creditId: string) => void;
  selectedId?: string;
};

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

export function AdminCreditAccountCarousel({ credits, disabled, onSelect, selectedId }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  function scrollAccounts(left: number) {
    listRef.current?.scrollBy({ left, behavior: "smooth" });
  }

  return (
    <div className="creditAccounts">
      <div className="creditAccountsHeader">
        <div>
          <strong>Cuentas del cliente</strong>
          <span>Desliza y selecciona una cuenta para revisar sus saldos.</span>
        </div>
        {credits.length > 1 ? (
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

      <div className="creditAccountList" ref={listRef}>
        {credits.map((credit) => (
          <button
            className={`creditAccountButton${selectedId === credit.id ? " selected" : ""}`}
            key={credit.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(credit.id)}
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
  );
}
