import type { SaleSource, SaleStatus, SaleType } from "@prisma/client";

export type AdminSaleItem = {
  id: string;
  productId: string;
  productName: string;
  productReference: string;
  productCategory: string;
  productClass: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type AdminSale = {
  id: string;
  shortId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  orderId: string;
  orderShortId: string;
  source: SaleSource;
  type: SaleType;
  status: SaleStatus;
  notes: string;
  total: number;
  createdAt: string;
  createdAtISO: string;
  totalQuantity: number;
  items: AdminSaleItem[];
};

export const saleTypeLabels: Record<SaleType, string> = {
  CASH: "Contado",
  CREDIT: "Crédito",
  RESERVED: "Separado",
  CREDIT_CASH: "Credicontado",
  SISTECREDITO: "Sistecrédito",
};

export const saleSourceLabels: Record<SaleSource, string> = {
  LOCAL: "Local",
  ORDER: "Pedido web",
};

export const saleStatusLabels: Record<SaleStatus, string> = {
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
};
