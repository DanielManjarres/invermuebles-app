import { StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { isProtectedStockMovement } from "@/lib/stock-movement-policy";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    select: {
      id: true,
      nextStock: true,
      note: true,
      previousStock: true,
      product: { select: { id: true, name: true, stock: true } },
      reason: true,
      type: true,
      variant: {
        select: { id: true, name: true, productId: true, stock: true },
      },
      variantId: true,
    },
  });

  if (!movement) {
    return NextResponse.json(
      { message: "No se encontro el movimiento." },
      { status: 404 }
    );
  }

  if (isProtectedStockMovement(movement)) {
    return NextResponse.json(
      {
        message:
          "Los movimientos automáticos no se corrigen manualmente. Gestiona la operación que los originó para conservar el historial.",
      },
      { status: 409 }
    );
  }

  const latestMovement = await prisma.stockMovement.findFirst({
    where: movement.variantId
      ? { variantId: movement.variantId }
      : { productId: movement.product.id, variantId: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  if (latestMovement?.id !== movement.id) {
    return NextResponse.json(
      {
        message:
          "Solo se puede corregir el movimiento mas reciente de un producto para no alterar la secuencia del inventario.",
      },
      { status: 409 }
    );
  }

  const currentStock = movement.variant?.stock ?? movement.product.stock;
  if (currentStock !== movement.nextStock) {
    return NextResponse.json(
      {
        message:
          "El stock cambio despues de este movimiento. Revisa el inventario antes de corregirlo.",
      },
      { status: 409 }
    );
  }

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

  const correctionType =
    movement.previousStock > currentStock
      ? StockMovementType.ENTRY
      : movement.previousStock < currentStock
        ? StockMovementType.EXIT
        : StockMovementType.ADJUSTMENT;
  const correctionQuantity = Math.abs(
    movement.previousStock - currentStock
  );

  if (correctionQuantity === 0) {
    return NextResponse.json(
      { message: "Este movimiento ya no cambia el stock actual." },
      { status: 409 }
    );
  }

  let correction;
  try {
    correction = await prisma.$transaction(async (tx) => {
      if (movement.variant) {
        const update = await tx.productVariant.updateMany({
          where: { id: movement.variant.id, stock: currentStock },
          data: { stock: movement.previousStock },
        });
        if (update.count !== 1) throw new Error("STOCK_CHANGED");

        const aggregate = await tx.productVariant.aggregate({
          where: { productId: movement.product.id },
          _sum: { stock: true },
        });
        await tx.product.update({
          where: { id: movement.product.id },
          data: { stock: aggregate._sum.stock ?? 0 },
        });
      } else {
        const update = await tx.product.updateMany({
          where: { id: movement.product.id, stock: currentStock },
          data: { stock: movement.previousStock },
        });
        if (update.count !== 1) throw new Error("STOCK_CHANGED");
      }

      return tx.stockMovement.create({
        data: {
          nextStock: movement.previousStock,
          previousStock: currentStock,
          productId: movement.product.id,
          quantity: correctionQuantity,
          reason: "Correccion de movimiento",
          note: `Se corrigio el movimiento ${movement.id} y se conservo el registro original.`,
          type: correctionType,
          userId: admin.id,
          variantId: movement.variantId,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_CHANGED") {
      return NextResponse.json(
        { message: "El stock cambió durante la corrección. Intenta nuevamente." },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({
    id: correction.id,
    productId: movement.product.id,
    variantId: movement.variantId,
    stock: movement.previousStock,
    message: "Movimiento corregido y registrado en el historial.",
  });
}
