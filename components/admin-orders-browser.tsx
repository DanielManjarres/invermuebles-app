"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  MessageCircle,
  ReceiptText,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  orderChannelLabels,
  orderStatusDescriptions,
  orderStatusLabels,
  type AdminOrder,
} from "@/lib/orders";
import type { AdminCustomer } from "@/lib/customers";
import { canTransitionOrderStatus } from "@/lib/order-status-policy";
import { SelectMenu } from "@/components/select-menu";

const allStatuses = "all";
const ordersPerPage = 8;

type OrderStatusFilter = AdminOrder["status"] | typeof allStatuses;

const statusOptions: AdminOrder["status"][] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
];

const statusFilterOptions = statusOptions.filter(
  (status) => status !== "CANCELLED"
);

const statusMenuOptions = statusOptions.map((status) => ({
  label: orderStatusLabels[status],
  value: status,
}));

function getStatusMenuOptions(currentStatus: AdminOrder["status"]) {
  return statusMenuOptions.filter(({ value }) =>
    canTransitionOrderStatus(currentStatus, value),
  );
}

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
    order.customerName,
    order.customerDocument,
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
  customers: AdminCustomer[];
  orders: AdminOrder[];
};

export function AdminOrdersBrowser({
  customers,
  orders: initialOrders,
}: AdminOrdersBrowserProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] =
    useState<OrderStatusFilter>(allStatuses);
  const [currentPage, setCurrentPage] = useState(1);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const [orderToDelete, setOrderToDelete] = useState<AdminOrder | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(initialOrders.map((order) => [order.id, order.notes]))
  );
  const [draftCustomerIds, setDraftCustomerIds] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        initialOrders.map((order) => [order.id, order.customerId])
      )
  );

  useEffect(() => {
    setOrders(initialOrders);
    setDraftNotes(
      Object.fromEntries(initialOrders.map((order) => [order.id, order.notes]))
    );
    setDraftCustomerIds(
      Object.fromEntries(
        initialOrders.map((order) => [order.id, order.customerId])
      )
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

    return orders
      .filter((order) => order.status !== "CANCELLED")
      .filter((order) => {
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
  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        label: customer.document
          ? `${customer.fullName} - CC ${customer.document}`
          : customer.fullName,
        value: customer.id,
      })),
    [customers]
  );

  function findCustomer(customerId: string) {
    return (
      customers.find((currentCustomer) => currentCustomer.id === customerId) ??
      null
    );
  }

  async function updateOrder(
    order: AdminOrder,
    nextStatus = order.status,
    nextNotes = draftNotes[order.id] ?? "",
    nextCustomerId = draftCustomerIds[order.id] ?? ""
  ) {
    setSavingOrderId(order.id);
    setNotice("");
    const selectedCustomer = findCustomer(nextCustomerId);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        body: JSON.stringify({
          customerId: nextCustomerId || null,
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

      setOrders((currentOrders) => {
        if (nextStatus === "CANCELLED") {
          return currentOrders.filter(
            (currentOrder) => currentOrder.id !== order.id
          );
        }

        return currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                customerId: nextCustomerId,
                customerName: selectedCustomer?.fullName ?? "",
                customerDocument: selectedCustomer?.document ?? "",
                notes: nextNotes,
                status: nextStatus,
              }
            : currentOrder
        );
      });
      setNotice(
        nextStatus === "CANCELLED"
          ? `Pedido #${order.shortId} cancelado y retirado de la bandeja.`
          : `Pedido #${order.shortId} actualizado.`
      );
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setSavingOrderId("");
    }
  }

  function prepareSaleFromOrder(order: AdminOrder) {
    if (order.saleId) {
      return;
    }

    if (!order.customerId) {
      setNotice("Asocia un cliente antes de preparar la venta.");
      return;
    }
    router.push(`/admin/ventas?pedido=${order.id}`);
  }

  async function deleteOrder(order: AdminOrder) {
    if (deletingOrderId || deleteConfirmation !== "ELIMINAR") return;

    setDeletingOrderId(order.id);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo eliminar el pedido.");
        setOrderToDelete(null);
        setDeleteConfirmation("");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.filter((currentOrder) => currentOrder.id !== order.id)
      );
      setOrderToDelete(null);
      setDeleteConfirmation("");
      setNotice(`Pedido #${order.shortId} eliminado permanentemente.`);
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setDeletingOrderId("");
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
          {statusFilterOptions.map((status) => (
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
                    <SelectMenu
                      disabled={savingOrderId === order.id || Boolean(order.saleId)}
                      onChange={(value) =>
                        updateOrder(order, value as AdminOrder["status"])
                      }
                      options={getStatusMenuOptions(order.status)}
                      placeholder="Selecciona estado"
                      value={order.status}
                    />
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

                <div className="orderCustomerPanel">
                  <div className="orderCustomerInfo">
                    <span>Cliente asociado</span>
                    {order.customerName ? (
                      <>
                        <strong>{order.customerName}</strong>
                        <small>
                          {order.customerDocument
                            ? `CC ${order.customerDocument}`
                            : "Sin cedula registrada"}
                        </small>
                      </>
                    ) : (
                      <>
                        <strong>Sin cliente asociado</strong>
                        <small>
                          Selecciona un cliente antes de crear la venta.
                        </small>
                      </>
                    )}
                  </div>

                  <label className="orderCustomerControl">
                    Asociar cliente
                    <SelectMenu
                      disabled={savingOrderId === order.id || Boolean(order.saleId)}
                      onChange={(value) =>
                        setDraftCustomerIds((currentCustomerIds) => ({
                          ...currentCustomerIds,
                          [order.id]: value,
                        }))
                      }
                      options={customerOptions}
                      placeholder="Sin cliente asociado"
                      value={draftCustomerIds[order.id] ?? ""}
                    />
                  </label>
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
                        className={
                          order.saleId
                            ? "futureSaleButton saleCreatedButton"
                            : "futureSaleButton"
                        }
                        disabled={
                          !order.customerId ||
                          savingOrderId === order.id ||
                          Boolean(order.saleId)
                        }
                        title={
                          order.saleId
                            ? "Este pedido ya tiene venta creada."
                            : !order.customerId
                              ? "Asocia un cliente antes de crear la venta."
                            : "Preparar la venta con cliente, modalidad y precios finales."
                        }
                        type="button"
                        onClick={() => prepareSaleFromOrder(order)}
                      >
                        <ReceiptText size={18} />
                        {order.saleId
                          ? `Venta #${order.saleShortId}`
                          : savingOrderId === order.id
                            ? "Preparando..."
                            : "Preparar venta"}
                      </button>
                    ) : null}

                    {!order.saleId ? (
                      <button
                        className="dangerButton"
                        disabled={savingOrderId === order.id || deletingOrderId === order.id}
                        type="button"
                        onClick={() => {
                          setOrderToDelete(order);
                          setDeleteConfirmation("");
                        }}
                      >
                        <Trash2 size={18} />
                        Eliminar pedido
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

      {orderToDelete ? (
        <div className="modalOverlay" role="presentation">
          <div className="adminModal recordDeleteModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acción permanente</p>
                <h2>Eliminar pedido</h2>
              </div>
              <button
                aria-label="Cerrar confirmacion"
                className="modalClose"
                type="button"
                onClick={() => {
                  setOrderToDelete(null);
                  setDeleteConfirmation("");
                }}
              >
                ×
              </button>
            </div>

            <div className="recordDeleteWarning">
              <Trash2 size={20} />
              <p>
                El pedido y sus productos asociados se eliminarán permanentemente.
                Esta acción solo está disponible mientras no exista una venta relacionada.
              </p>
            </div>

            <div className="recordDeleteTarget">
              <span>Pedido seleccionado</span>
              <strong>Pedido #{orderToDelete.shortId}</strong>
              <small>{orderToDelete.totalQuantity} unidad(es)</small>
            </div>

            <label className="deleteConfirmationField">
              Escribe ELIMINAR para confirmar
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
            </label>

            <div className="modalActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setOrderToDelete(null);
                  setDeleteConfirmation("");
                }}
              >
                Cancelar
              </button>
              <button
                className="dangerButton"
                disabled={
                  deletingOrderId === orderToDelete.id || deleteConfirmation !== "ELIMINAR"
                }
                type="button"
                onClick={() => deleteOrder(orderToDelete)}
              >
                <Trash2 size={18} />
                {deletingOrderId === orderToDelete.id
                  ? "Eliminando..."
                  : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
