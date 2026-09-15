import type { OrderChannel, OrderStatus } from "@prisma/client";

export type AdminOrderItem = {
  id: string;
  productId: string;
  productName: string;
  productReference: string;
  productCategory: string;
  productClass: string;
  quantity: number;
};

export type AdminOrder = {
  id: string;
  shortId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  status: OrderStatus;
  channel: OrderChannel;
  notes: string;
  createdAt: string;
  createdAtISO: string;
  updatedAt: string;
  saleId: string;
  saleShortId: string;
  items: AdminOrderItem[];
  totalQuantity: number;
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONTACTED: "Contactado",
  CONFIRMED: "Confirmado",
};

export const orderStatusDescriptions: Record<OrderStatus, string> = {
  PENDING: "Solicitud nueva, falta contactar al cliente.",
  CONTACTED: "El cliente ya fue contactado por WhatsApp.",
  CONFIRMED: "El pedido fue confirmado con el cliente.",
};

export const orderChannelLabels: Record<OrderChannel, string> = {
  STORE: "Almacén",
  WHATSAPP: "WhatsApp",
};
