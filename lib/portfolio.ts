import type { AdminCredit, AdminCreditPayment } from "@/lib/credits";
import type { AdminSale, AdminSaleItem, AdminSalePayment } from "@/lib/sales";

const portfolioPaymentMethodLabels = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
} as const;

const portfolioSaleTypeLabels = {
  CASH: "Contado",
  CREDIT: "Crédito",
  RESERVED: "Separado",
  CREDIT_CASH: "Credicontado",
  SISTECREDITO: "Sistecrédito",
} as const;

export type PortfolioAccountStatus = "ACTIVE" | "OVERDUE" | "PAID";
export type PortfolioAccountGroup = "OPEN" | "PAID";

export type PortfolioPayment = {
  id: string;
  amount: number;
  methodLabel: string;
  reference: string;
  receiptNumber: string;
  note: string;
  principalAmount: number | null;
  interestAmount: number | null;
  isInitial: boolean;
  createdAt: string;
  createdAtISO: string;
  userName: string;
};

export type PortfolioAccount = {
  id: string;
  entityId: string;
  source: "CREDIT" | "SALE";
  kind: AdminSale["type"];
  title: string;
  status: PortfolioAccountStatus;
  statusLabel: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  saleId: string;
  saleShortId: string;
  shortId: string;
  createdAt: string;
  createdAtISO: string;
  total: number;
  amountPaid: number;
  balance: number;
  items: AdminSaleItem[];
  payments: PortfolioPayment[];
  credit: AdminCredit | null;
  sale: AdminSale | null;
};

function mapCreditPayment(payment: AdminCreditPayment): PortfolioPayment {
  return {
    id: payment.id,
    amount: payment.amount,
    methodLabel: payment.methodLabel,
    reference: payment.reference,
    receiptNumber: payment.receiptNumber,
    note: payment.note,
    principalAmount: payment.principalAmount,
    interestAmount: payment.interestAmount,
    isInitial: payment.isInitial,
    createdAt: payment.createdAt,
    createdAtISO: payment.createdAtISO,
    userName: payment.userName,
  };
}

function mapSalePayment(payment: AdminSalePayment): PortfolioPayment {
  return {
    id: payment.id,
    amount: payment.amount,
    methodLabel: portfolioPaymentMethodLabels[payment.method],
    reference: payment.reference,
    receiptNumber: payment.receiptNumber,
    note: payment.note,
    principalAmount: null,
    interestAmount: null,
    isInitial: payment.isInitial,
    createdAt: payment.createdAt,
    createdAtISO: payment.createdAtISO,
    userName: payment.userName,
  };
}

export function buildPortfolioAccounts(
  credits: AdminCredit[],
  sales: AdminSale[],
): PortfolioAccount[] {
  const creditAccounts = credits.map<PortfolioAccount>((credit) => ({
      id: `credit:${credit.id}`,
      entityId: credit.id,
      source: "CREDIT",
      kind: credit.saleType,
      title: credit.saleTypeLabel,
      status:
        credit.status === "OVERDUE"
          ? "OVERDUE"
          : credit.status === "PAID"
            ? "PAID"
            : "ACTIVE",
      statusLabel: credit.statusLabel,
      customerId: credit.customerId,
      customerName: credit.customerName,
      customerDocument: credit.customerDocument,
      customerPhone: credit.customerPhone,
      saleId: credit.saleId,
      saleShortId: credit.saleShortId,
      shortId: credit.shortId,
      createdAt: credit.createdAt,
      createdAtISO: credit.createdAtISO,
      total: credit.total,
      amountPaid: credit.amountPaid,
      balance: credit.balance,
      items: credit.items,
      payments: credit.payments.map(mapCreditPayment),
      credit,
      sale: null,
    }));

  const saleAccounts = sales
    .filter(
      (sale) =>
        Boolean(sale.customerId) &&
        (sale.type === "CASH" || sale.type === "RESERVED" || sale.type === "SISTECREDITO"),
    )
    .map<PortfolioAccount>((sale) => {
      const status: PortfolioAccountStatus =
        sale.type === "RESERVED" && sale.balance > 0 ? "ACTIVE" : "PAID";
      const payments = sale.payments.map(mapSalePayment);

      if (sale.type === "SISTECREDITO" && !payments.length) {
        payments.push({
          id: `sistecredito:${sale.id}`,
          amount: sale.total,
          methodLabel: "Sistecrédito",
          reference: sale.sistecreditoApproval,
          receiptNumber: "",
          note: "Pago aprobado por Sistecrédito.",
          principalAmount: null,
          interestAmount: null,
          isInitial: true,
          createdAt: sale.createdAt,
          createdAtISO: sale.createdAtISO,
          userName: "Administrador",
        });
      }

      return {
        id: `sale:${sale.id}`,
        entityId: sale.id,
        source: "SALE",
        kind: sale.type,
        title: portfolioSaleTypeLabels[sale.type],
        status,
        statusLabel: status === "ACTIVE" ? "Activo" : "Pagado",
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerDocument: sale.customerDocument,
        customerPhone: sale.customerPhone,
        saleId: sale.id,
        saleShortId: sale.shortId,
        shortId: sale.shortId,
        createdAt: sale.createdAt,
        createdAtISO: sale.createdAtISO,
        total: sale.total,
        amountPaid: sale.amountPaid,
        balance: sale.balance,
        items: sale.items,
        payments,
        credit: null,
        sale,
      };
    });

  return [...creditAccounts, ...saleAccounts].sort((first, second) =>
    second.createdAtISO.localeCompare(first.createdAtISO),
  );
}
