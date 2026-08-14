import type { Prisma } from "@prisma/client";
import {
  getCustomerPortfolioStatus,
  type AdminCustomer,
} from "@/lib/customers";
import { creditStatusLabels } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { paymentMethodLabels, saleTypeLabels } from "@/lib/sales";

const customerInclude = {
  _count: {
    select: {
      credits: true,
      orders: true,
      sales: true,
    },
  },
  credits: {
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
      interestBalance: true,
      outstandingPrincipal: true,
      status: true,
      total: true,
      sale: {
        select: {
          id: true,
          type: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: { productName: true, quantity: true },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          },
        },
      },
    },
  },
  sales: {
    orderBy: { createdAt: "desc" },
    select: {
      balance: true,
      createdAt: true,
      id: true,
      total: true,
      type: true,
      credit: {
        select: { id: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: { productName: true, quantity: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          amount: true,
          createdAt: true,
          id: true,
          isInitial: true,
          method: true,
        },
      },
    },
  },
} satisfies Prisma.CustomerInclude;

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

function formatDate(date?: Date | null) {
  if (!date) {
    return "Sin registros";
  }

  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapCustomer(customer: CustomerWithRelations): AdminCustomer {
  const overdueCreditsCount = customer.credits.filter(
    (credit) => credit.status === "OVERDUE"
  ).length;
  const status = getCustomerPortfolioStatus(
    customer.status,
    overdueCreditsCount
  );
  const payments = customer.sales
    .flatMap((sale) => {
      const accountShortId = (sale.credit?.id ?? sale.id)
        .slice(-6)
        .toUpperCase();
      const salePayments = sale.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        accountShortId,
        accountTitle: saleTypeLabels[sale.type],
        methodLabel: paymentMethodLabels[payment.method],
        createdAt: formatDate(payment.createdAt),
        createdAtValue: payment.createdAt,
        isInitial: payment.isInitial,
      }));

      if (sale.type === "SISTECREDITO" && salePayments.length === 0) {
        salePayments.push({
          id: `sistecredito:${sale.id}`,
          amount: Number(sale.total),
          accountShortId,
          accountTitle: saleTypeLabels[sale.type],
          methodLabel: "Sistecrédito",
          createdAt: formatDate(sale.createdAt),
          createdAtValue: sale.createdAt,
          isInitial: true,
        });
      }

      return salePayments;
    })
    .sort((first, second) => second.createdAtValue.getTime() - first.createdAtValue.getTime());
  const creditAccounts = customer.credits.map((credit) => ({
    id: `credit:${credit.id}`,
    shortId: credit.id.slice(-6).toUpperCase(),
    saleShortId: credit.sale?.id.slice(-6).toUpperCase() ?? "",
    title: saleTypeLabels[credit.sale?.type ?? "CREDIT"],
    statusLabel: creditStatusLabels[credit.status],
    total: Number(credit.total),
    balance:
      Number(credit.outstandingPrincipal) + Number(credit.interestBalance),
    paymentsCount: credit.sale?.payments.length ?? 0,
    lastPaymentAt: formatDate(credit.sale?.payments[0]?.createdAt),
    createdAt: formatDate(credit.createdAt),
    createdAtValue: credit.createdAt,
    products:
      credit.sale?.items
        .map((item) => `${item.productName} x ${item.quantity}`)
        .join(", ") || "Sin productos registrados",
  }));
  const saleAccounts = customer.sales
    .filter(
      (sale) =>
        sale.type === "CASH" ||
        sale.type === "RESERVED" ||
        sale.type === "SISTECREDITO"
    )
    .map((sale) => {
      const isOpen = sale.type === "RESERVED" && Number(sale.balance) > 0;
      const hasSyntheticPayment =
        sale.type === "SISTECREDITO" && sale.payments.length === 0;

      return {
        id: `sale:${sale.id}`,
        shortId: sale.id.slice(-6).toUpperCase(),
        saleShortId: sale.id.slice(-6).toUpperCase(),
        title: saleTypeLabels[sale.type],
        statusLabel: isOpen ? "Activo" : "Pagado",
        total: Number(sale.total),
        balance: Number(sale.balance),
        paymentsCount: sale.payments.length + (hasSyntheticPayment ? 1 : 0),
        lastPaymentAt: formatDate(
          sale.payments[0]?.createdAt ??
            (hasSyntheticPayment ? sale.createdAt : null)
        ),
        createdAt: formatDate(sale.createdAt),
        createdAtValue: sale.createdAt,
        products:
          sale.items
            .map((item) => `${item.productName} x ${item.quantity}`)
            .join(", ") || "Sin productos registrados",
      };
    });
  const recentAccounts = [...creditAccounts, ...saleAccounts]
    .sort(
      (first, second) =>
        second.createdAtValue.getTime() - first.createdAtValue.getTime()
    )
    .slice(0, 5);

  return {
    id: customer.id,
    fullName: customer.fullName,
    document: customer.document ?? "",
    phone: customer.phone,
    email: customer.email ?? "",
    address: customer.address ?? "",
    neighborhood: customer.neighborhood ?? "",
    city: customer.city ?? "",
    referenceName: customer.referenceName ?? "",
    referenceRelation: customer.referenceRelation ?? "",
    referencePhone: customer.referencePhone ?? "",
    status,
    notes: customer.notes ?? "",
    createdAt: formatDate(customer.createdAt),
    updatedAt: formatDate(customer.updatedAt),
    ordersCount: customer._count.orders,
    salesCount: customer._count.sales,
    creditsCount: customer._count.credits,
    activeCreditsCount: customer.credits.filter(
      (credit) => credit.status === "ACTIVE" || credit.status === "OVERDUE"
    ).length,
    overdueCreditsCount,
    paymentsCount: payments.length,
    totalPaid: payments.reduce((total, payment) => total + payment.amount, 0),
    lastPaymentAt: payments[0]?.createdAt ?? "Sin pagos registrados",
    recentAccounts: recentAccounts.map(({ createdAtValue, ...account }) =>
      account
    ),
    recentPayments: payments.slice(0, 5).map(({ createdAtValue, ...payment }) =>
      payment
    ),
  };
}

export async function getCustomers(): Promise<AdminCustomer[]> {
  const customers = await prisma.customer.findMany({
    include: customerInclude,
    orderBy: { fullName: "asc" },
  });

  return customers.map(mapCustomer);
}

export async function getCustomerById(id: string): Promise<AdminCustomer | null> {
  const customer = await prisma.customer.findUnique({
    include: customerInclude,
    where: { id },
  });

  return customer ? mapCustomer(customer) : null;
}
