import type { PaymentMethod as PrismaPaymentMethod, SaleSource, SaleStatus, SaleType } from "@prisma/client";

export type PaymentMethod = PrismaPaymentMethod;

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

export type AdminSalePayment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  note: string;
  isInitial: boolean;
  createdAt: string;
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
  paymentMethod: PaymentMethod | null;
  creditId: string;
  creditMonths: number | null;
  interestRate: number | null;
  amountPaid: number;
  balance: number;
  notes: string;
  total: number;
  createdAt: string;
  createdAtISO: string;
  totalQuantity: number;
  items: AdminSaleItem[];
  payments: AdminSalePayment[];
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
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
  PENDING_PAYMENT: "Pendiente de pago",
  PENDING_DELIVERY: "Pendiente de entrega",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};
