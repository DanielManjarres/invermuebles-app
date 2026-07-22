import { StockMovementType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const initialInventoryNotes = [
  "Carga inicial de productos",
  "Producto creado desde gestion de productos",
];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
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

  const hasOnlyInitialMovement = product.stockMovements.every(
    (movement) =>
      movement.type === StockMovementType.ADJUSTMENT &&
      movement.reason === "Inventario inicial" &&
      initialInventoryNotes.includes(movement.note ?? "")
  );

  if (!hasOnlyInitialMovement) {
    return NextResponse.json(
      {
        message:
          "Este producto ya tiene movimientos de inventario. Para conservar el historial, ocultalo del catalogo en vez de eliminarlo.",
      },
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
