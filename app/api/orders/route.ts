import { NextResponse } from "next/server";
import { OrderChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderItemRequest = {
  productId?: string;
  quantity?: number;
  variantId?: string;
};

type OrderRequest = {
  items?: OrderItemRequest[];
};

function normalizeItems(items: OrderItemRequest[] = []) {
  return items
    .map((item) => ({
      productId: item.productId?.trim() ?? "",
      quantity: Number(item.quantity),
      variantId: item.variantId?.trim() ?? "",
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
      visible: true,
    },
    select: {
      catalogProductType: {
        select: { category: { select: { name: true } }, name: true },
      },
      id: true,
      name: true,
      productClass: { select: { name: true } },
      productType: { select: { name: true } },
      reference: true,
      stock: true,
    },
  });
  const variants = await prisma.productVariant.findMany({
    where: {
      active: true,
      id: {
        in: items.map((item) => item.variantId).filter(Boolean),
      },
    },
    select: {
      id: true,
      name: true,
      productId: true,
      reference: true,
      stock: true,
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const unavailableItem = items.find((item) => {
    const product = productById.get(item.productId);
    const variant = item.variantId ? variantById.get(item.variantId) : null;
    if (!product || (item.variantId && variant?.productId !== product.id)) return true;
    return item.quantity > (variant?.stock ?? product.stock);
  });

  if (unavailableItem) {
    const product = productById.get(unavailableItem.productId);
    const variant = unavailableItem.variantId
      ? variantById.get(unavailableItem.variantId)
      : null;
    const availableStock = variant?.stock ?? product?.stock ?? 0;
    return NextResponse.json(
      {
        message: product
          ? `Solo hay ${availableStock} unidad(es) disponibles de ${product.name}${variant ? ` · ${variant.name}` : ""}.`
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
        create: items.map((item) => {
          const product = productById.get(item.productId)!;
          const variant = item.variantId
            ? variantById.get(item.variantId)
            : null;
          return {
            productCategory:
              product.catalogProductType?.category.name ?? product.productType.name,
            productId: item.productId,
            productName: product.name,
            productReference: variant?.reference ?? product.reference,
            productTypeName:
              product.catalogProductType?.name ?? product.productClass.name,
            quantity: item.quantity,
            variantId: variant?.id ?? null,
            variantName: variant?.name ?? null,
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
