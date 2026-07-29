import { StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function isSaleMovement(reason: string, note: string | null) {
  return (
    reason.startsWith("Venta ") ||
    reason === "Venta desde pedido confirmado" ||
    reason === "Devolucion por anulacion de venta" ||
    note?.includes("Venta ") === true
  );
}

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
    },
  });

  if (!movement) {
    return NextResponse.json(
      { message: "No se encontro el movimiento." },
      { status: 404 }
    );
  }

  if (isSaleMovement(movement.reason, movement.note)) {
    return NextResponse.json(
      {
        message:
          "Los movimientos relacionados con ventas no se eliminan. Anula la venta para registrar la devolucion correctamente.",
      },
      { status: 409 }
    );
  }

  const latestMovement = await prisma.stockMovement.findFirst({
    where: { productId: movement.product.id },
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

  if (movement.product.stock !== movement.nextStock) {
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
    movement.previousStock > movement.product.stock
      ? StockMovementType.ENTRY
      : movement.previousStock < movement.product.stock
        ? StockMovementType.EXIT
        : StockMovementType.ADJUSTMENT;
  const correctionQuantity = Math.abs(
    movement.previousStock - movement.product.stock
  );

  if (correctionQuantity === 0) {
    return NextResponse.json(
      { message: "Este movimiento ya no cambia el stock actual." },
      { status: 409 }
    );
  }

  const correction = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: movement.product.id },
      data: { stock: movement.previousStock },
    });

    return tx.stockMovement.create({
      data: {
        nextStock: movement.previousStock,
        previousStock: movement.product.stock,
        productId: movement.product.id,
        quantity: correctionQuantity,
        reason: "Correccion de movimiento",
        note: `Se corrigio el movimiento ${movement.id} y se conservo el registro original.`,
        type: correctionType,
        userId: admin.id,
      },
      select: { id: true },
    });
  });

  return NextResponse.json({
    id: correction.id,
    productId: movement.product.id,
    stock: movement.previousStock,
    message: "Movimiento corregido y registrado en el historial.",
  });
}
