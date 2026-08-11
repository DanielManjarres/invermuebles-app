import type {
  CreditStatus,
  PaymentMethod as PrismaPaymentMethod,
  SaleType,
} from "@prisma/client";
import type { AdminSaleItem } from "@/lib/sales";

export type PaymentMethod = PrismaPaymentMethod;

export type AdminCreditPayment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  methodLabel: string;
  reference: string;
  note: string;
  principalAmount: number;
  interestAmount: number;
  isInitial: boolean;
  createdAt: string;
  createdAtISO: string;
  userName: string;
};

export type AdminCredit = {
  id: string;
  shortId: string;
  saleId: string;
  saleShortId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  saleType: SaleType;
  saleTypeLabel: string;
  status: CreditStatus;
  statusLabel: string;
  months: number;
  interestRate: number;
  principal: number;
  total: number;
  outstandingPrincipal: number;
  interestBalance: number;
  balance: number;
  saleTotal: number;
  amountPaid: number;
  createdAt: string;
  createdAtISO: string;
  updatedAt: string;
  lastPaymentAt: string;
  items: AdminSaleItem[];
  payments: AdminCreditPayment[];
};

export type CreditStats = {
  total: number;
  active: number;
  overdue: number;
  paid: number;
  totalBalance: number;
};

export const creditStatusLabels: Record<CreditStatus, string> = {
  ACTIVE: "Activo",
  PAID: "Pagado",
  OVERDUE: "En mora",
  CANCELLED: "Cancelado",
};
