import type { CustomerStatus } from "@prisma/client";

export type AdminCustomer = {
  id: string;
  fullName: string;
  document: string;
  phone: string;
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
  creditsCount: number;
  activeCreditsCount: number;
  lastOrderAt: string;
};

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "Activo",
  OVERDUE: "En mora",
  INACTIVE: "Inactivo",
  BLOCKED: "Bloqueado",
};

export const customerStatusDescriptions: Record<CustomerStatus, string> = {
  ACTIVE: "Cliente habilitado para compras y seguimiento normal.",
  OVERDUE: "Cliente con pagos o cuotas pendientes por revisar.",
  INACTIVE: "Cliente sin movimiento reciente o pausado temporalmente.",
  BLOCKED: "Cliente restringido por decision administrativa.",
};
