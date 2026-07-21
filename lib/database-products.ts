import type { Product } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import type { MovementType, StockMovement } from "@/lib/stock-movements";
import type { StockMovementType } from "@prisma/client";

const fallbackImage =
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80";

type ProductFilters = {
  availableOnly?: boolean;
  visibleOnly?: boolean;
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
