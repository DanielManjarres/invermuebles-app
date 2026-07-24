import { NextResponse } from "next/server";
import { OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderItemRequest = {
  productId?: string;
  quantity?: number;
};

type OrderRequest = {
  items?: OrderItemRequest[];
};

function normalizeItems(items: OrderItemRequest[] = []) {
  return items
    .map((item) => ({
      productId: item.productId?.trim() ?? "",
      quantity: Number(item.quantity),
    }))
    .filter((item) => item.productId && Number.isInteger(item.quantity));
}

export async function POST(request: Request) {
  const body = (await request.json()) as OrderRequest;
  const items = normalizeItems(body.items);

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
      stock: { gt: 0 },
      visible: true,
    },
    select: {
      id: true,
      name: true,
      stock: true,
    },
  });

  if (products.length !== items.length) {
    return NextResponse.json(
      {
        message:
          "Uno de los productos ya no esta disponible en el catalogo. Actualiza el carrito e intenta de nuevo.",
      },
      { status: 400 }
    );
  }

  const productStock = new Map(
    products.map((product) => [product.id, { name: product.name, stock: product.stock }])
  );
  const unavailableItem = items.find((item) => {
    const product = productStock.get(item.productId);
    return product ? item.quantity > product.stock : true;
  });

  if (unavailableItem) {
    const product = productStock.get(unavailableItem.productId);
    return NextResponse.json(
      {
        message: product
          ? `Solo hay ${product.stock} unidad(es) disponibles de ${product.name}.`
          : "Uno de los productos ya no esta disponible.",
      },
      { status: 400 }
    );
  }

  const order = await prisma.order.create({
    data: {
      channel: OrderChannel.WHATSAPP,
      notes: "Solicitud generada desde el carrito web.",
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
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
