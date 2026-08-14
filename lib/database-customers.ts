import type { Prisma } from "@prisma/client";
import {
  getCustomerPortfolioStatus,
  type AdminCustomer,
} from "@/lib/customers";
import { creditStatusLabels } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import {
  paymentMethodLabels,
  saleStatusLabels,
  saleTypeLabels,
} from "@/lib/sales";

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
      id: true,
      interestBalance: true,
      outstandingPrincipal: true,
      status: true,
      total: true,
      sale: {
        select: {
          payments: {
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          },
        },
      },
    },
  },
  orders: {
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 1,
  },
  sales: {
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
      status: true,
      total: true,
      type: true,
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
    .flatMap((sale) =>
      sale.payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        methodLabel: paymentMethodLabels[payment.method],
        createdAt: formatDate(payment.createdAt),
        createdAtValue: payment.createdAt,
        isInitial: payment.isInitial,
        saleShortId: sale.id.slice(-6).toUpperCase(),
      }))
    )
    .sort((first, second) => second.createdAtValue.getTime() - first.createdAtValue.getTime());

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
    lastOrderAt: formatDate(customer.orders[0]?.createdAt),
    lastSaleAt: formatDate(customer.sales[0]?.createdAt),
    lastPaymentAt: payments[0]?.createdAt ?? "Sin pagos registrados",
    recentSales: customer.sales.slice(0, 5).map((sale) => ({
      id: sale.id,
      shortId: sale.id.slice(-6).toUpperCase(),
      typeLabel: saleTypeLabels[sale.type],
      statusLabel: saleStatusLabels[sale.status],
      total: Number(sale.total),
      createdAt: formatDate(sale.createdAt),
      products:
        sale.items
          .map((item) => `${item.productName} x ${item.quantity}`)
          .join(", ") || "Sin productos registrados",
    })),
    recentCredits: customer.credits.slice(0, 5).map((credit) => ({
      id: credit.id,
      shortId: credit.id.slice(-6).toUpperCase(),
      statusLabel: creditStatusLabels[credit.status],
      total: Number(credit.total),
      balance:
        Number(credit.outstandingPrincipal) + Number(credit.interestBalance),
      paymentsCount: credit.sale?.payments.length ?? 0,
      lastPaymentAt: formatDate(credit.sale?.payments[0]?.createdAt),
    })),
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
