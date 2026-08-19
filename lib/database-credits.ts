import type { Prisma } from "@prisma/client";
import type { AdminCredit, CreditStats } from "@/lib/credits";
import { creditStatusLabels } from "@/lib/credits";
import { paymentMethodLabels, saleTypeLabels } from "@/lib/sales";
import { prisma } from "@/lib/prisma";

const creditInclude = {
  customer: true,
  sale: {
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
      payments: {
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  },
} satisfies Prisma.CreditInclude;

type CreditWithRelations = Prisma.CreditGetPayload<{
  include: typeof creditInclude;
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

function mapCredit(credit: CreditWithRelations): AdminCredit {
  const items =
    credit.sale?.items.map((item) => ({
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
    })) ?? [];

  const saleType = credit.sale?.type ?? "CREDIT";
  const payments = (credit.sale?.payments ?? []).map((payment) => ({
    id: payment.id,
    amount: Number(payment.amount),
    method: payment.method,
    methodLabel: paymentMethodLabels[payment.method],
    reference: payment.reference ?? "",
    note: payment.note ?? "",
    principalAmount: Number(payment.principalAmount ?? 0),
    interestAmount: Number(payment.interestAmount ?? 0),
    isInitial: payment.isInitial,
    createdAt: formatDate(payment.createdAt),
    createdAtISO: payment.createdAt.toISOString(),
    userName: payment.user?.name ?? "Administrador",
  }));

  const outstandingPrincipal = Number(credit.outstandingPrincipal);
  const interestBalance = Number(credit.interestBalance);

  return {
    id: credit.id,
    shortId: credit.id.slice(-6).toUpperCase(),
    saleId: credit.saleId ?? "",
    saleShortId: credit.saleId ? credit.saleId.slice(-6).toUpperCase() : "",
    customerId: credit.customerId,
    customerName: credit.customer.fullName,
    customerDocument: credit.customer.document ?? "",
    customerPhone: credit.customer.phone,
    saleType,
    saleTypeLabel: saleTypeLabels[saleType],
    status: credit.status,
    statusLabel: creditStatusLabels[credit.status],
    months: credit.months,
    interestRate: Number(credit.interestRate),
    principal: Number(credit.principal),
    total: Number(credit.total),
    outstandingPrincipal,
    interestBalance,
    balance: outstandingPrincipal + interestBalance,
    saleTotal: Number(credit.sale?.total ?? 0),
    amountPaid: Number(credit.sale?.amountPaid ?? 0),
    createdAt: formatDate(credit.createdAt),
    createdAtISO: credit.createdAt.toISOString(),
    updatedAt: formatDate(credit.updatedAt),
    lastPaymentAt: payments[0]?.createdAt ?? "Sin pagos registrados",
    items,
    payments,
  };
}

export async function getCredits(): Promise<AdminCredit[]> {
  const credits = await prisma.credit.findMany({
    include: creditInclude,
    orderBy: { createdAt: "desc" },
  });

  return credits.map(mapCredit);
}

export async function getCreditById(id: string): Promise<AdminCredit | null> {
  const credit = await prisma.credit.findUnique({
    where: { id },
    include: creditInclude,
  });

  return credit ? mapCredit(credit) : null;
}

export async function getCreditStats(): Promise<CreditStats> {
  const credits = await prisma.credit.findMany({
    select: {
      status: true,
      outstandingPrincipal: true,
      interestBalance: true,
    },
  });

  return credits.reduce<CreditStats>(
    (stats, credit) => {
      const balance =
        Number(credit.outstandingPrincipal) + Number(credit.interestBalance);

      stats.total += 1;

      if (credit.status === "ACTIVE") {
        stats.active += 1;
      }

      if (credit.status === "OVERDUE") {
        stats.overdue += 1;
      }

      if (credit.status === "PAID") {
        stats.paid += 1;
      }

      if (credit.status !== "PAID") {
        stats.totalBalance += balance;
      }

      return stats;
    },
    {
      active: 0,
      overdue: 0,
      paid: 0,
      total: 0,
      totalBalance: 0,
    }
  );
}
