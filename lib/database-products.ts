import type { Product } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import type { AdminOrder } from "@/lib/orders";
import type { MovementType, StockMovement } from "@/lib/stock-movements";
import type { StockMovementType } from "@prisma/client";

const fallbackImage =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80";

type ProductFilters = {
  availableOnly?: boolean;
  visibleOnly?: boolean;
};

export type DatabaseProductType = {
  name: string;
  classes: string[];
};

function mapMovementType(type: StockMovementType): MovementType {
  if (type === "ENTRY") {
    return "entry";
  }

  if (type === "EXIT") {
    return "exit";
  }

  return "adjustment";
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      ...(filters.visibleOnly ? { visible: true } : {}),
      ...(filters.availableOnly ? { stock: { gt: 0 } } : {}),
    },
    include: {
      catalogProductType: {
        include: { category: true },
      },
      productClass: true,
      productType: true,
      variants: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ productType: { name: "asc" } }, { name: "asc" }],
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    reference: product.reference,
    category: product.productType.name,
    productClass: product.productClass.name,
    details: product.details,
    cost: Number(product.cost),
    salePrice: Number(product.salePrice),
    stock: product.stock,
    visible: product.visible,
    image: product.imageUrl ?? fallbackImage,
    catalogCategory: product.catalogProductType?.category.name,
    catalogProductType: product.catalogProductType?.name,
    variants: product.variants.map((variant) => ({
      active: variant.active,
      id: variant.id,
      isDefault: variant.isDefault,
      location: variant.location ?? "",
      minimumStock: variant.minimumStock,
      name: variant.name,
      reference: variant.reference,
      stock: variant.stock,
    })),
  }));
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const movements = await prisma.stockMovement.findMany({
    where: { archivedAt: null },
    include: {
      product: {
        include: {
          productClass: true,
          productType: true,
        },
      },
      variant: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.variant
      ? `${movement.product.name} · ${movement.variant.name}`
      : movement.product.name,
    productReference: movement.variant?.reference ?? movement.product.reference,
    productCategory: movement.product.productType.name,
    productClass: movement.product.productClass.name,
    variantId: movement.variantId ?? undefined,
    variantName: movement.variant?.name ?? undefined,
    variantReference: movement.variant?.reference ?? undefined,
    type: mapMovementType(movement.type),
    quantity: movement.quantity,
    previousStock: movement.previousStock,
    nextStock: movement.nextStock,
    reason: movement.reason,
    note: movement.note ?? "",
    createdAt: movement.createdAt.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    createdAtISO: movement.createdAt.toISOString(),
    user: movement.user?.name ?? "Administrador",
  }));
}

export async function getProductTypes(): Promise<DatabaseProductType[]> {
  const productTypes = await prisma.productType.findMany({
    include: {
      classes: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return productTypes.map((productType) => ({
    name: productType.name,
    classes: productType.classes.map((productClass) => productClass.name),
  }));
}

export async function getOrders(): Promise<AdminOrder[]> {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: {
            include: {
              productClass: true,
              productType: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      sale: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => {
    const items = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productReference: item.product.reference,
      productCategory: item.product.productType.name,
      productClass: item.product.productClass.name,
      quantity: item.quantity,
    }));

    return {
      id: order.id,
      shortId: order.id.slice(-6).toUpperCase(),
      customerId: order.customerId ?? "",
      customerName: order.customer?.fullName ?? "",
      customerDocument: order.customer?.document ?? "",
      status: order.status,
      channel: order.channel,
      notes: order.notes ?? "",
      createdAt: order.createdAt.toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      createdAtISO: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      saleId: order.sale?.id ?? "",
      saleShortId: order.sale?.id.slice(-6).toUpperCase() ?? "",
      items,
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    };
  });
}
