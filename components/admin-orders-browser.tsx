"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  AdminOrderCard,
  type AdminOrderChanges,
} from "@/components/admin-order-card";
import { AdminOrderDeleteModal } from "@/components/admin-order-delete-modal";
import {
  orderStatusLabels,
  type AdminOrder,
} from "@/lib/orders";
import type { AdminCustomer } from "@/lib/customers";
import { canPrepareOrderSale } from "@/lib/order-policy";

const allStatuses = "all";
const ordersPerPage = 8;

type OrderStatusFilter = AdminOrder["status"] | typeof allStatuses;

const statusOptions: AdminOrder["status"][] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
];

const statusFilterOptions = statusOptions;

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
  const [customerQueries, setCustomerQueries] = useState<Record<string, string>>({});
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

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.status !== "CANCELLED"),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visibleOrders.filter((order) => {
        const matchesStatus =
          activeStatus === allStatuses || order.status === activeStatus;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          getOrderSearchText(order).includes(normalizedQuery);

        return matchesStatus && matchesQuery;
      });
  }, [activeStatus, query, visibleOrders]);

  const orderStats = useMemo(
    () => ({
      total: visibleOrders.length,
      pending: visibleOrders.filter((order) => order.status === "PENDING")
        .length,
      contacted: visibleOrders.filter((order) => order.status === "CONTACTED")
        .length,
      confirmed: visibleOrders.filter((order) => order.status === "CONFIRMED")
        .length,
    }),
    [visibleOrders]
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );
  function getCustomerOptions(order: AdminOrder) {
    const search = (customerQueries[order.id] ?? "").trim().toLowerCase();

    return customers
      .filter((customer) => customer.status === "ACTIVE" || customer.id === order.customerId)
      .filter((customer) =>
        customer.id === order.customerId ||
        [customer.fullName, customer.document, customer.phone, customer.city]
          .join(" ")
          .toLowerCase()
          .includes(search),
      )
      .map((customer) => ({
        label: customer.document
          ? `${customer.fullName} - CC ${customer.document}`
          : customer.fullName,
        value: customer.id,
      }));
  }

  function findCustomer(customerId: string) {
    return (
      customers.find((currentCustomer) => currentCustomer.id === customerId) ??
      null
    );
  }

  async function updateOrder(
    order: AdminOrder,
    changes: AdminOrderChanges,
  ) {
    if (savingOrderId) return;

    setSavingOrderId(order.id);
    setNotice("");
    const selectedCustomer = changes.customerId === undefined
      ? null
      : findCustomer(changes.customerId);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        body: JSON.stringify({
          customerId: changes.customerId,
          notes: changes.notes,
          status: changes.status,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setNotice(result.message ?? "No se pudo actualizar el pedido.");
        return;
      }

      const clearsCustomer = changes.status === "PENDING" || (
        order.status === "PENDING" && changes.status === "CONTACTED"
      );

      setOrders((currentOrders) => {
        return currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                customerId: clearsCustomer
                  ? ""
                  : changes.customerId ?? currentOrder.customerId,
                customerName: clearsCustomer
                  ? ""
                  : changes.customerId === undefined
                  ? currentOrder.customerName
                  : selectedCustomer?.fullName ?? "",
                customerDocument: clearsCustomer
                  ? ""
                  : changes.customerId === undefined
                  ? currentOrder.customerDocument
                  : selectedCustomer?.document ?? "",
                notes: changes.notes ?? currentOrder.notes,
                status: changes.status ?? currentOrder.status,
              }
            : currentOrder
        );
      });
      setNotice(`Pedido #${order.shortId} actualizado.`);
      if (
        changes.customerId !== undefined ||
        changes.status === "PENDING" ||
        (order.status === "PENDING" && changes.status === "CONTACTED")
      ) {
        setCustomerQueries((current) => ({ ...current, [order.id]: "" }));
      }
    } catch {
      setNotice("No se pudo conectar con el sistema.");
    } finally {
      setSavingOrderId("");
    }
  }

  function prepareSaleFromOrder(order: AdminOrder) {
    if (!canPrepareOrderSale(order.status, order.customerId || null, Boolean(order.saleId))) {
      setNotice("Confirma el pedido y asocia un cliente antes de preparar la venta.");
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
              <AdminOrderCard
                customerOptions={getCustomerOptions(order)}
                customerQuery={customerQueries[order.id] ?? ""}
                deleting={deletingOrderId === order.id}
                draftNotes={draftNotes[order.id] ?? ""}
                key={order.id}
                order={order}
                saving={savingOrderId === order.id}
                onCustomerQueryChange={(value) =>
                  setCustomerQueries((current) => ({
                    ...current,
                    [order.id]: value,
                  }))
                }
                onDraftNotesChange={(value) =>
                  setDraftNotes((current) => ({
                    ...current,
                    [order.id]: value,
                  }))
                }
                onPrepareSale={() => prepareSaleFromOrder(order)}
                onRequestDelete={() => {
                  setOrderToDelete(order);
                  setDeleteConfirmation("");
                }}
                onUpdate={(changes) => updateOrder(order, changes)}
              />
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
        <AdminOrderDeleteModal
          confirmation={deleteConfirmation}
          deleting={deletingOrderId === orderToDelete.id}
          order={orderToDelete}
          onCancel={() => {
            setOrderToDelete(null);
            setDeleteConfirmation("");
          }}
          onConfirmationChange={setDeleteConfirmation}
          onConfirm={() => deleteOrder(orderToDelete)}
        />
      ) : null}
    </section>
  );
}
