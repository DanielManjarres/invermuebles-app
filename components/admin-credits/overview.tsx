import { Search } from "lucide-react";

import type { CreditStats } from "@/lib/credits";

export type CreditFilter = "ALL" | "ACTIVE" | "OVERDUE" | "PAID" | "CANCELLED";

type Props = {
  disabled: boolean;
  filter: CreditFilter;
  onFilterChange: (filter: CreditFilter) => void;
  onQueryChange: (query: string) => void;
  query: string;
  stats: CreditStats;
};

const filters: Array<{ label: string; value: CreditFilter }> = [
  { label: "Todos", value: "ALL" },
  { label: "Activos", value: "ACTIVE" },
  { label: "En mora", value: "OVERDUE" },
  { label: "Pagados", value: "PAID" },
];

function formatMoney(value: number) {
  return `$ ${new Intl.NumberFormat("es-CO").format(value)}`;
}

export function AdminCreditsOverview({
  disabled,
  filter,
  onFilterChange,
  onQueryChange,
  query,
  stats,
}: Props) {
  return (
    <>
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
            disabled={disabled}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por cliente, cédula, teléfono, venta o producto"
          />
        </label>

        <div className="creditFilters" aria-label="Filtrar cartera">
          {filters.map((option) => (
            <button
              className={filter === option.value ? "active" : ""}
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
