import { NextResponse } from "next/server";
import { OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCatalogOrderItemError,
  normalizeCatalogOrderItems,
} from "@/lib/catalog-order-policy";

type OrderItemRequest = {
  productId?: string;
  quantity?: number;
};

type OrderRequest = {
  items?: OrderItemRequest[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as OrderRequest;
  const items = normalizeCatalogOrderItems(body.items);

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Agrega al menos un producto al pedido." },
      { status: 400 }
    );
  }

  if (items.some((item) => item.quantity < 1)) {
    return NextResponse.json(
      { message: "La cantidad de cada producto debe ser mayor a cero." },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: items.map((item) => item.productId) },
      visible: true,
    },
    select: {
      catalogProductType: {
        select: { category: { select: { name: true } }, name: true },
      },
      id: true,
      name: true,
      reference: true,
      stock: true,
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));
  const itemError = items
    .map((item) => {
      const product = productById.get(item.productId);
      return getCatalogOrderItemError(
        item,
        product
          ? {
              name: product.name,
              stock: product.stock,
            }
          : undefined,
      );
    })
    .find(Boolean);

  if (itemError) {
    return NextResponse.json(
      { message: itemError },
      { status: 400 }
    );
  }

  const order = await prisma.order.create({
    data: {
      channel: OrderChannel.WHATSAPP,
      notes: "Solicitud generada desde el carrito web.",
      items: {
        create: items.map((item) => {
          const product = productById.get(item.productId)!;
          return {
            productCategory: product.catalogProductType.category.name,
            productId: item.productId,
            productName: product.name,
            productReference: product.reference,
            productTypeName: product.catalogProductType.name,
            quantity: item.quantity,
          };
        }),
      },
    },
  });

  return NextResponse.json(
    {
      id: order.id,
      message: "Pedido registrado correctamente.",
    },
    { status: 201 }
  );
}
