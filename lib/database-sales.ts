import type { Prisma } from "@prisma/client";
import type { AdminSale } from "@/lib/sales";
import { prisma } from "@/lib/prisma";

const saleInclude = {
  customer: true,
  credit: true,
  order: true,
  payments: {
    include: {
      user: true,
    },
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

function mapVariantAttributes(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((attribute) => {
    if (!attribute || typeof attribute !== "object" || Array.isArray(attribute)) return [];

    const name = typeof attribute.name === "string" ? attribute.name : "";
    const unit = typeof attribute.unit === "string" ? attribute.unit : "";
    const attributeValue = typeof attribute.value === "string" ? attribute.value : "";
    return name && attributeValue ? [{ name, unit, value: attributeValue }] : [];
  });
}

function mapSale(sale: SaleWithRelations): AdminSale {
  const items = sale.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId ?? "",
    variantName: item.variantName ?? "",
    variantAttributes: mapVariantAttributes(item.variantAttributes),
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
    customerPhone: sale.customer?.phone ?? "",
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
    sistecreditoApproval: sale.sistecreditoApproval ?? "",
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
      createdAtISO: payment.createdAt.toISOString(),
      userName: payment.user?.name ?? "Administrador",
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
