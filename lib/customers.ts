import type { CustomerStatus } from "@prisma/client";

export type AdminCustomerAccount = {
  id: string;
  shortId: string;
  saleShortId: string;
  title: string;
  statusLabel: string;
  total: number;
  balance: number;
  paymentsCount: number;
  lastPaymentAt: string;
  createdAt: string;
  products: string;
};

export type AdminCustomerPayment = {
  id: string;
  amount: number;
  methodLabel: string;
  createdAt: string;
  isInitial: boolean;
  saleShortId: string;
};

export type AdminCustomer = {
  id: string;
  fullName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  city: string;
  referenceName: string;
  referenceRelation: string;
  referencePhone: string;
  status: CustomerStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  salesCount: number;
  creditsCount: number;
  activeCreditsCount: number;
  overdueCreditsCount: number;
  paymentsCount: number;
  totalPaid: number;
  lastPaymentAt: string;
  recentAccounts: AdminCustomerAccount[];
  recentPayments: AdminCustomerPayment[];
};

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "Activo",
  OVERDUE: "En mora",
  INACTIVE: "Inactivo",
  BLOCKED: "Bloqueado",
};

export const customerStatusDescriptions: Record<CustomerStatus, string> = {
  ACTIVE: "Cliente habilitado para compras y seguimiento normal.",
  OVERDUE: "Estado calculado a partir de créditos actualmente en mora.",
  INACTIVE: "Cliente sin movimiento reciente o pausado temporalmente.",
  BLOCKED: "Cliente restringido por decision administrativa.",
};

export function getCustomerPortfolioStatus(
  status: CustomerStatus,
  overdueCreditsCount: number
): CustomerStatus {
  if (status === "INACTIVE" || status === "BLOCKED") {
    return status;
  }

  return overdueCreditsCount > 0 ? "OVERDUE" : "ACTIVE";
}
