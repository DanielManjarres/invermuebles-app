import type { Prisma } from "@prisma/client";
import type { AdminCustomer } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

const customerInclude = {
  _count: {
    select: {
      credits: true,
      orders: true,
    },
  },
  credits: {
    select: { status: true },
  },
  orders: {
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 1,
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
    status: customer.status,
    notes: customer.notes ?? "",
    createdAt: formatDate(customer.createdAt),
    updatedAt: formatDate(customer.updatedAt),
    ordersCount: customer._count.orders,
    creditsCount: customer._count.credits,
    activeCreditsCount: customer.credits.filter(
      (credit) => credit.status === "ACTIVE" || credit.status === "OVERDUE"
    ).length,
    lastOrderAt: formatDate(customer.orders[0]?.createdAt),
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
