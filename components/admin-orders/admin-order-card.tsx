"use client";

import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageCircle,
  ReceiptText,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { SelectMenu, type SelectMenuOption } from "@/components/select-menu";
import { canEditOrderCustomer } from "@/lib/order-policy";
import { canTransitionOrderStatus } from "@/lib/order-status-policy";
import {
  orderChannelLabels,
  orderStatusDescriptions,
  orderStatusLabels,
  type AdminOrder,
} from "@/lib/orders";

export type AdminOrderChanges = {
  customerId?: string;
  notes?: string;
  status?: AdminOrder["status"];
};

type AdminOrderCardProps = {
  customerOptions: SelectMenuOption[];
  customerQuery: string;
  deleting: boolean;
  draftNotes: string;
  onCustomerQueryChange: (value: string) => void;
  onDraftNotesChange: (value: string) => void;
  onPrepareSale: () => void;
  onRequestDelete: () => void;
  onUpdate: (changes: AdminOrderChanges) => void;
  order: AdminOrder;
  saving: boolean;
};

const cardStatuses: AdminOrder["status"][] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
];

const statusIcons: Record<AdminOrder["status"], ReactNode> = {
  PENDING: <Clock3 size={16} />,
  CONTACTED: <MessageCircle size={16} />,
  CONFIRMED: <CheckCircle2 size={16} />,
};

function getStatusMenuOptions(order: AdminOrder) {
  return cardStatuses
    .filter((status) =>
      canTransitionOrderStatus(order.status, status) &&
      (status !== "CONFIRMED" || Boolean(order.customerId)),
    )
    .map((status) => ({
      label: orderStatusLabels[status],
      value: status,
    }));
}

export function AdminOrderCard({
  customerOptions,
  customerQuery,
  deleting,
  draftNotes,
  onCustomerQueryChange,
  onDraftNotesChange,
  onPrepareSale,
  onRequestDelete,
  onUpdate,
  order,
  saving,
}: AdminOrderCardProps) {
  return (
    <article className="orderCard">
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
            disabled={saving || Boolean(order.saleId)}
            onChange={(value) =>
              onUpdate({ status: value as AdminOrder["status"] })
            }
            options={getStatusMenuOptions(order)}
            placeholder="Selecciona estado"
            value={order.status}
          />
        </label>
      </div>

      <div className="orderCardBody">
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

        {order.status !== "PENDING" ? (
          <div className="orderCustomerPanel">
            <div className="orderCustomerInfo">
              <span>Cliente asociado</span>
              {order.customerName ? (
                <>
                  <strong>{order.customerName}</strong>
                  <small>
                    {order.customerDocument
                      ? `CC ${order.customerDocument}`
                      : "Sin cédula registrada"}
                  </small>
                </>
              ) : (
                <>
                  <strong>Sin cliente asociado</strong>
                  <small>Selecciona un cliente antes de crear la venta.</small>
                </>
              )}
            </div>

            {canEditOrderCustomer(order.status, Boolean(order.saleId)) ? (
              <div className="orderCustomerControls">
                <label className="orderCustomerSearch">
                  Buscar cliente
                  <div className="searchBox compactSearchBox">
                    <Search size={17} />
                    <input
                      type="search"
                      placeholder="Nombre, cédula, teléfono o ciudad"
                      value={customerQuery}
                      onChange={(event) => onCustomerQueryChange(event.target.value)}
                    />
                  </div>
                </label>
                <label className="orderCustomerControl">
                  Asociar cliente
                  <SelectMenu
                    disabled={saving}
                    onChange={(value) => onUpdate({ customerId: value })}
                    options={customerOptions}
                    placeholder="Sin cliente asociado"
                    value={order.customerId}
                  />
                </label>
                <button
                  className="secondaryButton orderResetCustomer"
                  disabled={!order.customerId || saving}
                  type="button"
                  onClick={() => onUpdate({ customerId: "" })}
                >
                  <XCircle size={17} />
                  Quitar cliente
                </button>
              </div>
            ) : (
              <p className="orderCustomerLocked">
                Cliente fijado al confirmar el pedido.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="orderFollowUp">
        <p className="orderDescription">
          {orderStatusDescriptions[order.status]}
        </p>
        <label className="orderNotes">
          Observaciones
          <textarea
            rows={1}
            value={draftNotes}
            placeholder="Ej: Cliente contactado, pendiente confirmar forma de pago."
            onChange={(event) => onDraftNotesChange(event.target.value)}
          />
        </label>
        <div className="orderActionGroup">
          {order.status === "PENDING" || order.status === "CONTACTED" ? (
            <button
              className="futureSaleButton"
              disabled={saving || (order.status === "CONTACTED" && !order.customerId)}
              title={
                order.status === "CONTACTED" && !order.customerId
                  ? "Asocia un cliente antes de confirmar el pedido."
                  : undefined
              }
              type="button"
              onClick={() =>
                onUpdate({
                  status: order.status === "PENDING" ? "CONTACTED" : "CONFIRMED",
                })
              }
            >
              {order.status === "PENDING" ? (
                <MessageCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {order.status === "PENDING" ? "Marcar contactado" : "Confirmar pedido"}
            </button>
          ) : null}
          <button
            className="secondaryButton"
            disabled={saving || draftNotes === order.notes}
            type="button"
            onClick={() => onUpdate({ notes: draftNotes })}
          >
            {draftNotes === order.notes
              ? "Observación guardada"
              : "Guardar observación"}
          </button>

          {order.status === "CONFIRMED" ? (
            <button
              className={
                order.saleId
                  ? "futureSaleButton saleCreatedButton"
                  : "futureSaleButton"
              }
              disabled={!order.customerId || saving || Boolean(order.saleId)}
              title={
                order.saleId
                  ? "Este pedido ya tiene venta creada."
                  : !order.customerId
                    ? "Asocia un cliente antes de crear la venta."
                    : "Preparar la venta con cliente, modalidad y precios finales."
              }
              type="button"
              onClick={onPrepareSale}
            >
              <ReceiptText size={18} />
              {order.saleId
                ? `Venta #${order.saleShortId}`
                : saving
                  ? "Preparando..."
                  : "Preparar venta"}
            </button>
          ) : null}

          {!order.saleId ? (
            <button
              className="dangerButton"
              disabled={saving || deleting}
              type="button"
              onClick={onRequestDelete}
            >
              <Trash2 size={18} />
              Eliminar pedido
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
