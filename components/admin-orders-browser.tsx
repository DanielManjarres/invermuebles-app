"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageCircle,
  ReceiptText,
  Search,
  XCircle,
} from "lucide-react";
import {
  orderChannelLabels,
  orderStatusDescriptions,
  orderStatusLabels,
  type AdminOrder,
} from "@/lib/orders";

const allStatuses = "all";
const ordersPerPage = 8;

type OrderStatusFilter = AdminOrder["status"] | typeof allStatuses;

const statusOptions: AdminOrder["status"][] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
];

const statusIcons: Record<AdminOrder["status"], ReactNode> = {
  PENDING: <Clock3 size={16} />,
  CONTACTED: <MessageCircle size={16} />,
  CONFIRMED: <CheckCircle2 size={16} />,
  CANCELLED: <XCircle size={16} />,
};

function getOrderSearchText(order: AdminOrder) {
  return [
    order.shortId,
    order.status,
    order.channel,
    order.notes,
    ...order.items.flatMap((item) => [
      item.productName,
      item.productReference,
      item.productCategory,
      item.productClass,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

type AdminOrdersBrowserProps = {
  orders: AdminOrder[];
};

export function AdminOrdersBrowser({ orders: initialOrders }: AdminOrdersBrowserProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] =
    useState<OrderStatusFilter>(allStatuses);
  const [currentPage, setCurrentPage] = useState(1);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [notice, setNotice] = useState("");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(initialOrders.map((order) => [order.id, order.notes]))
  );

  useEffect(() => {
    setOrders(initialOrders);
    setDraftNotes(
      Object.fromEntries(initialOrders.map((order) => [order.id, order.notes]))
    );
  }, [initialOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, query]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        activeStatus === allStatuses || order.status === activeStatus;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        getOrderSearchText(order).includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [activeStatus, orders, query]);

  const orderStats = useMemo(
    () => ({
      total: filteredOrders.length,
      pending: filteredOrders.filter((order) => order.status === "PENDING")
        .length,
      contacted: filteredOrders.filter((order) => order.status === "CONTACTED")
        .length,
      confirmed: filteredOrders.filter((order) => order.status === "CONFIRMED")
        .length,
    }),
    [filteredOrders]
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  async function updateOrder(
    order: AdminOrder,
    nextStatus = order.status,
    nextNotes = draftNotes[order.id] ?? ""
  ) {
    setSavingOrderId(order.id);
    setNotice("");

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        body: JSON.stringify({
          notes: nextNotes,
          status: nextStatus,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo actualizar el pedido.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                notes: nextNotes,
                status: nextStatus,
              }
            : currentOrder
        )
      );
      setNotice(`Pedido #${order.shortId} actualizado.`);
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setSavingOrderId("");
    }
  }

  return (
    <section className="tableSection ordersSection">
      <div className="sectionHeader movementSectionHeader ordersIntro">
        <div>
          <p className="eyebrow">Seguimiento comercial</p>
          <h2>Solicitudes por WhatsApp</h2>
          <p className="sectionLead">
            Estos pedidos nacen desde el carrito web. Aquí se revisan antes de
            crear una venta, cliente o crédito.
          </p>
        </div>
      </div>

      <div className="movementSummaryGrid" aria-label="Resumen de pedidos">
        <article>
          <span>Total pedidos</span>
          <strong>{orderStats.total}</strong>
        </article>
        <article>
          <span>Pendientes</span>
          <strong>{orderStats.pending}</strong>
        </article>
        <article>
          <span>Contactados</span>
          <strong>{orderStats.contacted}</strong>
        </article>
        <article>
          <span>Confirmados</span>
          <strong>{orderStats.confirmed}</strong>
        </article>
      </div>

      <div className="inventoryToolbar movementToolbar">
        <label className="searchBox">
          <Search size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por pedido, producto, referencia o estado"
            type="search"
            value={query}
          />
        </label>

        <div className="inventoryFilters" aria-label="Filtros de pedidos">
          <button
            className={
              activeStatus === allStatuses ? "filterButton active" : "filterButton"
            }
            type="button"
            onClick={() => setActiveStatus(allStatuses)}
          >
            Todos
          </button>
          {statusOptions.map((status) => (
            <button
              className={
                activeStatus === status ? "filterButton active" : "filterButton"
              }
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
            >
              {orderStatusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {notice ? (
        <div className="orderToast" role="status">
          <span>{notice}</span>
        </div>
      ) : null}

      {filteredOrders.length === 0 ? (
        <div className="emptyState">
          <h2>No hay pedidos registrados</h2>
          <p>
            Cuando un cliente envíe una solicitud desde el carrito, aparecerá
            en esta pantalla.
          </p>
        </div>
      ) : (
        <>
          <div className="movementResultsBar">
            <span>
              Mostrando {paginatedOrders.length} de {filteredOrders.length} pedido(s)
            </span>
            <span>
              Página {currentPage} de {totalPages}
            </span>
          </div>

          <div className="ordersList">
            {paginatedOrders.map((order) => (
              <article className="orderCard" key={order.id}>
                <div className="orderCardHeader">
                  <span className={`orderBadge ${order.status.toLowerCase()}`}>
                    {statusIcons[order.status]}
                    {orderStatusLabels[order.status]}
                  </span>

                  <div className="orderTitleBlock">
                    <h3>Pedido #{order.shortId}</h3>
                    <p>
                      {order.createdAt} · {orderChannelLabels[order.channel]} ·{" "}
                      {order.totalQuantity} unidad(es)
                    </p>
                  </div>

                  <label className="orderStatusControl">
                    Estado
                    <select
                      value={order.status}
                      disabled={savingOrderId === order.id}
                      onChange={(event) =>
                        updateOrder(order, event.target.value as AdminOrder["status"])
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {orderStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="orderItems">
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <strong>{item.productName}</strong>
                      <span>
                        {item.productReference} · {item.productCategory} /{" "}
                        {item.productClass}
                      </span>
                      <small>Cantidad: {item.quantity}</small>
                    </div>
                  ))}
                </div>

                <div className="orderFollowUp">
                  <p className="orderDescription">
                    {orderStatusDescriptions[order.status]}
                  </p>
                  <label className="orderNotes">
                    Observaciones
                    <textarea
                      rows={1}
                      value={draftNotes[order.id] ?? ""}
                      placeholder="Ej: Cliente contactado, pendiente confirmar forma de pago."
                      onChange={(event) =>
                        setDraftNotes((currentNotes) => ({
                          ...currentNotes,
                          [order.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="orderActionGroup">
                    <button
                      className="secondaryButton"
                      disabled={savingOrderId === order.id}
                      type="button"
                      onClick={() => updateOrder(order)}
                    >
                      Guardar observación
                    </button>

                    {order.status === "CONFIRMED" ? (
                      <button
                        className="futureSaleButton"
                        disabled
                        title="Esta acción se activará cuando exista el módulo de ventas."
                        type="button"
                      >
                        <ReceiptText size={18} />
                        Crear venta
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="paginationControls">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
