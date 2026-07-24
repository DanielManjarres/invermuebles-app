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
      productClass: true,
      productType: true,
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
  }));
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const movements = await prisma.stockMovement.findMany({
    include: {
      product: {
        include: {
          productClass: true,
          productType: true,
        },
      },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    productReference: movement.product.reference,
    productCategory: movement.product.productType.name,
    productClass: movement.product.productClass.name,
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
      items,
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    };
  });
}
