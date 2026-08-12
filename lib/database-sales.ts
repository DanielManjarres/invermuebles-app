import type { Prisma } from "@prisma/client";
import type { AdminSale } from "@/lib/sales";
import { prisma } from "@/lib/prisma";

const saleInclude = {
  customer: true,
  credit: true,
  order: true,
  payments: {
    orderBy: { createdAt: "asc" },
  },
  items: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{
  include: typeof saleInclude;
}>;

function formatDate(date: Date) {
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapSale(sale: SaleWithRelations): AdminSale {
  const items = sale.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productReference: item.productReference,
    productCategory: item.productCategory,
    productClass: item.productClass,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
  }));

  return {
    id: sale.id,
    shortId: sale.id.slice(-6).toUpperCase(),
    customerId: sale.customerId ?? "",
    customerName: sale.customer?.fullName ?? "Venta sin cliente registrado",
    customerDocument: sale.customer?.document ?? "",
    orderId: sale.orderId ?? "",
    orderShortId: sale.orderId ? sale.orderId.slice(-6).toUpperCase() : "",
    source: sale.source,
    type: sale.type,
    status: sale.status,
    paymentMethod:
      Number(sale.amountPaid) > 0 &&
      (sale.paymentMethod === "CASH" || sale.paymentMethod === "TRANSFER")
        ? sale.paymentMethod
        : null,
    creditId: sale.credit?.id ?? "",
    creditMonths: sale.credit?.months ?? null,
    interestRate: sale.credit ? Number(sale.credit.interestRate) : null,
    amountPaid: Number(sale.amountPaid),
    balance: Number(sale.balance),
    notes: sale.notes ?? "",
    total: Number(sale.total),
    createdAt: formatDate(sale.createdAt),
    createdAtISO: sale.createdAt.toISOString(),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    items,
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference ?? "",
      note: payment.note ?? "",
      isInitial: payment.isInitial,
      createdAt: formatDate(payment.createdAt),
    })),
  };
}

export async function getSales(): Promise<AdminSale[]> {
  const sales = await prisma.sale.findMany({
    include: saleInclude,
    orderBy: { createdAt: "desc" },
  });

  return sales.map(mapSale);
}
