import { CreditCard, PackageCheck, RotateCcw, Search, Trash2 } from "lucide-react";

import {
  paymentMethodLabels,
  saleSourceLabels,
  saleStatusLabels,
  saleTypeLabels,
  type AdminSale,
} from "@/lib/sales";

type Props = {
  deliveringSaleId: string;
  query: string;
  sales: AdminSale[];
  sourceFilter: string;
  onDelete: (sale: AdminSale) => void;
  onDeliveryAction: (sale: AdminSale, action: "DELIVER" | "UNDO_DELIVERY") => void;
  onFinance: (sale: AdminSale) => void;
  onQueryChange: (query: string) => void;
  onSourceFilterChange: (source: string) => void;
};

const sourceFilters = [
  { label: "Todas", value: "ALL" },
  { label: "Locales", value: "LOCAL" },
  { label: "Desde pedidos", value: "ORDER" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "COP",
  }).format(value);
}

export function AdminSalesHistory({
  deliveringSaleId,
  query,
  sales,
  sourceFilter,
  onDelete,
  onDeliveryAction,
  onFinance,
  onQueryChange,
  onSourceFilterChange,
}: Props) {
  return (
    <article className="salesHistoryPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Historial comercial</p>
          <h2>Ventas registradas</h2>
        </div>
      </div>

      <label className="searchBox">
        <Search size={18} />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por venta, cliente o producto"
          type="search"
          value={query}
        />
      </label>

      <div className="filterGroup saleHistoryFilters" aria-label="Filtrar ventas">
        {sourceFilters.map((filter) => (
          <button
            className={sourceFilter === filter.value ? "filterButton active" : "filterButton"}
            key={filter.value}
            type="button"
            onClick={() => onSourceFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="salesList">
        {!sales.length ? (
          <div className="emptyState compactEmptyState">
            <h2>No hay ventas registradas</h2>
            <p>Cuando finalices una venta, aparecerá en este historial.</p>
          </div>
        ) : (
          sales.map((sale) => (
            <article className="saleHistoryCard" key={sale.id}>
              <div>
                <span className="saleBadge">{saleStatusLabels[sale.status]}</span>
                <h3>Venta #{sale.shortId}</h3>
                <p>
                  {sale.createdAt} · {saleSourceLabels[sale.source]} · {saleTypeLabels[sale.type]}
                  {sale.paymentMethod ? ` · ${paymentMethodLabels[sale.paymentMethod]}` : ""}
                  {sale.creditMonths && sale.interestRate !== null
                    ? ` · ${sale.creditMonths} meses · ${sale.interestRate} % interés`
                    : ""}
                </p>
              </div>
              <div>
                <strong>{sale.customerName}</strong>
                <span>{sale.customerDocument ? `CC ${sale.customerDocument}` : "Sin cédula"}</span>
              </div>
              <div className="saleHistoryItems">
                {sale.items.map((item) => (
                  <span key={item.id}>{item.productName} x {item.quantity}</span>
                ))}
              </div>
              <div className="salePaymentSummary">
                <strong>{formatMoney(sale.total)}</strong>
                <span>Recibido: {formatMoney(sale.amountPaid)}</span>
                {sale.balance > 0 ? <span>Saldo: {formatMoney(sale.balance)}</span> : null}
              </div>
              {sale.status !== "CANCELLED" ? (
                <div className="saleHistoryActions">
                  {sale.status === "PENDING_DELIVERY" ? (
                    <button
                      className="primaryButton"
                      disabled={Boolean(deliveringSaleId)}
                      type="button"
                      onClick={() => onDeliveryAction(sale, "DELIVER")}
                    >
                      <PackageCheck size={16} />
                      {deliveringSaleId === sale.id ? "Confirmando..." : "Marcar entregada"}
                    </button>
                  ) : null}
                  {sale.status === "DELIVERED" ? (
                    <button
                      className="secondaryButton"
                      disabled={Boolean(deliveringSaleId)}
                      type="button"
                      onClick={() => onDeliveryAction(sale, "UNDO_DELIVERY")}
                    >
                      <RotateCcw size={16} />
                      Deshacer entrega
                    </button>
                  ) : null}
                  {sale.type === "RESERVED" || sale.type === "CREDIT" || sale.type === "CREDIT_CASH" ? (
                    <a
                      className="secondaryButton"
                      href={`/admin/cartera?buscar=${encodeURIComponent(
                        sale.customerDocument || sale.customerName,
                      )}`}
                    >
                      <CreditCard size={16} />
                      Ver en Cartera
                    </a>
                  ) : null}
                  {(sale.type === "CREDIT" || sale.type === "CREDIT_CASH") && !sale.creditId ? (
                    <button className="secondaryButton" type="button" onClick={() => onFinance(sale)}>
                      <CreditCard size={16} />
                      Configurar crédito
                    </button>
                  ) : null}
                  {sale.status !== "DELIVERED" ? (
                    <button className="dangerButton" type="button" onClick={() => onDelete(sale)}>
                      <Trash2 size={16} />
                      Eliminar venta
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </article>
  );
}
