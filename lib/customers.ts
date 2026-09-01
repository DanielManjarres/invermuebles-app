import type { CustomerStatus, SaleType } from "@prisma/client";

const customerAccountTitles: Record<SaleType, string> = {
  CASH: "Contado",
  CREDIT: "Crédito",
  RESERVED: "Separado",
  CREDIT_CASH: "Credicontado",
  SISTECREDITO: "Sistecrédito",
};

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
  accountShortId: string;
  accountTitle: string;
  methodLabel: string;
  createdAt: string;
  isInitial: boolean;
  saleType: SaleType;
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

export function getCustomerPaymentAccount(
  saleType: SaleType,
  saleId: string,
  creditId?: string | null,
) {
  const usesCreditAccount =
    saleType === "CREDIT" || saleType === "CREDIT_CASH";
  const accountId = usesCreditAccount && creditId ? creditId : saleId;

  return {
    accountShortId: accountId.slice(-6).toUpperCase(),
    accountTitle: customerAccountTitles[saleType],
  };
}

export function getCustomerPaymentLabel(
  saleType: SaleType,
  isInitial: boolean,
) {
  if (saleType === "CASH") {
    return "Pago de contado";
  }

  if (saleType === "SISTECREDITO") {
    return "Pago por Sistecrédito";
  }

  return isInitial ? "Pago inicial" : "Abono";
}

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
