import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { canDeleteProduct } from "@/lib/product-delete-policy";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      stockMovements: {
        select: {
          id: true,
          note: true,
          reason: true,
          type: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
          saleItems: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { message: "No se encontro el producto." },
      { status: 404 }
    );
  }

  if (product._count.orderItems > 0) {
    return NextResponse.json(
      {
        message:
          "Este producto ya tiene pedidos registrados. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
      },
      { status: 409 }
    );
  }

  if (product._count.saleItems > 0) {
    return NextResponse.json(
      {
        message:
          "Este producto ya tiene ventas registradas. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
      },
      { status: 409 }
    );
  }

  const deletePolicy = canDeleteProduct({
    orderItemsCount: product._count.orderItems,
    saleItemsCount: product._count.saleItems,
    stockMovements: product.stockMovements,
  });

  if (!deletePolicy.allowed) {
    return NextResponse.json(
      { message: deletePolicy.reason },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.stockMovement.deleteMany({
      where: { productId: id },
    }),
    prisma.product.delete({
      where: { id },
    }),
  ]);

  return NextResponse.json({
    deletedInitialMovements: product.stockMovements.length,
    id: product.id,
    name: product.name,
  });
}
