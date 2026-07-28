import { NextResponse } from "next/server";
import { OrderStatus, SaleSource, SaleType, StockMovementType, UserRole } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type SaleItemRequest = {
  productId?: string;
  quantity?: number;
  unitPrice?: number;
};

type SaleRequest = {
  customerId?: string | null;
  items?: SaleItemRequest[];
  notes?: string;
  orderId?: string;
  type?: SaleType;
};

const allowedSaleTypes = new Set<SaleType>([
  SaleType.CASH,
  SaleType.CREDIT,
  SaleType.RESERVED,
  SaleType.CREDIT_CASH,
  SaleType.SISTECREDITO,
]);

function normalizeItems(items: SaleItemRequest[] = []) {
  const itemMap = new Map<
    string,
    { productId: string; quantity: number; unitPrice?: number }
  >();

  for (const item of items) {
    const productId = item.productId?.trim() ?? "";
    const quantity = Number(item.quantity);
    const unitPrice =
      typeof item.unitPrice === "number" ? Number(item.unitPrice) : undefined;

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      continue;
    }

    if (unitPrice !== undefined && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      continue;
    }

    const currentItem = itemMap.get(productId);

    itemMap.set(productId, {
      productId,
      quantity: (currentItem?.quantity ?? 0) + quantity,
      unitPrice: unitPrice ?? currentItem?.unitPrice,
    });
  }

  return Array.from(itemMap.values());
}

async function getAdminUserId() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@invermuebles.com" },
    update: { active: true, name: "Administrador", role: UserRole.ADMIN },
    create: {
      active: true,
      email: "admin@invermuebles.com",
      name: "Administrador",
      role: UserRole.ADMIN,
    },
  });

  return admin.id;
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as SaleRequest;
  const saleType = allowedSaleTypes.has(body.type as SaleType)
    ? (body.type as SaleType)
    : SaleType.CASH;
  const source = body.orderId ? SaleSource.ORDER : SaleSource.LOCAL;

  if (body.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { message: "Selecciona un cliente valido para la venta." },
        { status: 400 }
      );
    }
  }

  try {
    const adminUserId = await getAdminUserId();

    const sale = await prisma.$transaction(async (tx) => {
      let customerId = body.customerId || null;
      let orderId: string | null = body.orderId?.trim() || null;
      let items = normalizeItems(body.items);

      if (orderId) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            sale: true,
          },
        });

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        if (order.status !== OrderStatus.CONFIRMED) {
          throw new Error("ORDER_NOT_CONFIRMED");
        }

        if (order.sale) {
          throw new Error("ORDER_ALREADY_SOLD");
        }

        customerId = customerId || order.customerId;
        items = order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: undefined,
        }));
      }

      if (items.length === 0) {
        throw new Error("EMPTY_SALE");
      }

      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
        include: {
          productClass: true,
          productType: true,
        },
      });

      if (products.length !== items.length) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const productsById = new Map(products.map((product) => [product.id, product]));
      const saleItems = [];
      let total = 0;

      for (const item of items) {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (product.stock < item.quantity) {
          throw new Error(`OUT_OF_STOCK:${product.name}:${product.stock}`);
        }

        const nextStock = product.stock - item.quantity;
        const unitPrice = item.unitPrice ?? Number(product.salePrice);
        const lineTotal = unitPrice * item.quantity;
        total += lineTotal;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: nextStock },
        });

        await tx.stockMovement.create({
          data: {
            nextStock,
            previousStock: product.stock,
            productId: product.id,
            quantity: item.quantity,
            reason: source === SaleSource.ORDER ? "Venta desde pedido" : "Venta local",
            note: body.notes?.trim() || null,
            type: StockMovementType.EXIT,
            userId: adminUserId,
          },
        });

        saleItems.push({
          cost: product.cost,
          lineTotal,
          productCategory: product.productType.name,
          productClass: product.productClass.name,
          productId: product.id,
          productName: product.name,
          productReference: product.reference,
          quantity: item.quantity,
          unitPrice,
        });
      }

      return tx.sale.create({
        data: {
          customerId,
          items: { create: saleItems },
          notes: body.notes?.trim() || null,
          orderId,
          source,
          total,
          type: saleType,
        },
      });
    });

    return NextResponse.json(
      {
        id: sale.id,
        message: "Venta registrada correctamente.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMPTY_SALE") {
        return NextResponse.json(
          { message: "Agrega al menos un producto a la venta." },
          { status: 400 }
        );
      }

      if (error.message === "ORDER_NOT_FOUND") {
        return NextResponse.json(
          { message: "El pedido seleccionado no existe." },
          { status: 404 }
        );
      }

      if (error.message === "ORDER_NOT_CONFIRMED") {
        return NextResponse.json(
          { message: "Solo se puede crear venta de pedidos confirmados." },
          { status: 400 }
        );
      }

      if (error.message === "ORDER_ALREADY_SOLD") {
        return NextResponse.json(
          { message: "Este pedido ya fue convertido en venta." },
          { status: 400 }
        );
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          { message: "Uno de los productos no existe." },
          { status: 404 }
        );
      }

      if (error.message.startsWith("OUT_OF_STOCK:")) {
        const [, productName, stock] = error.message.split(":");
        return NextResponse.json(
          {
            message: `No hay stock suficiente de ${productName}. Disponible: ${stock}.`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "No se pudo registrar la venta." },
      { status: 500 }
    );
  }
}
