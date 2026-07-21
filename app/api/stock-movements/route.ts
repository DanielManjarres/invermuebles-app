import { NextResponse } from "next/server";
import { StockMovementType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type StockMovementRequest = {
  note?: string;
  productId?: string;
  quantity?: number;
  reason?: string;
  type?: "entry" | "exit" | "adjustment";
};

function toDatabaseMovementType(type: StockMovementRequest["type"]) {
  if (type === "entry") {
    return StockMovementType.ENTRY;
  }

  if (type === "exit") {
    return StockMovementType.EXIT;
  }

  if (type === "adjustment") {
    return StockMovementType.ADJUSTMENT;
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as StockMovementRequest;
  const movementType = toDatabaseMovementType(body.type);
  const quantity = Number(body.quantity);
  const reason = body.reason?.trim() ?? "";

  if (!body.productId || !movementType || !reason) {
    return NextResponse.json(
      { message: "Completa los datos del movimiento." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { message: "La cantidad debe ser mayor a cero." },
      { status: 400 }
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: body.productId },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const previousStock = product.stock;
      const nextStock =
        movementType === StockMovementType.ENTRY
          ? previousStock + quantity
          : movementType === StockMovementType.EXIT
            ? previousStock - quantity
            : quantity;

      if (nextStock < 0) {
        throw new Error("NEGATIVE_STOCK");
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: nextStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          nextStock,
          previousStock,
          productId: product.id,
          quantity,
          reason,
          note: body.note?.trim() || null,
          type: movementType,
          userId: admin.id,
        },
      });

      return {
        movementId: movement.id,
        nextStock,
        previousStock,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "El producto no existe." },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "NEGATIVE_STOCK") {
      return NextResponse.json(
        { message: "La salida no puede dejar el stock en negativo." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo guardar el movimiento." },
      { status: 500 }
    );
  }
}
