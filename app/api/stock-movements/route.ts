import { NextResponse } from "next/server";
import { Prisma, StockMovementType, UserRole } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  calculateNextStock,
  isValidStockMovementQuantity,
} from "@/lib/stock-calculator";

type StockMovementRequest = {
  note?: string;
  productId?: string;
  quantity?: number;
  reason?: string;
  type?: "entry" | "exit" | "adjustment";
  variantId?: string;
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
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as StockMovementRequest;
  const movementType = toDatabaseMovementType(body.type);
  const quantity = Number(body.quantity);
  const reason = body.reason?.trim() ?? "";

  if ((!body.productId && !body.variantId) || !movementType || !reason) {
    return NextResponse.json(
      { message: "Completa los datos del movimiento." },
      { status: 400 }
    );
  }

  if (!isValidStockMovementQuantity(body.type!, quantity)) {
    return NextResponse.json(
      {
        message:
          body.type === "adjustment"
            ? "El stock ajustado debe ser un número entero mayor o igual a cero."
            : "La cantidad debe ser un número entero mayor a cero.",
      },
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
    const saveMovement = () =>
      prisma.$transaction(
        async (tx) => {
          const variant = body.variantId
            ? await tx.productVariant.findUnique({
                where: { id: body.variantId },
                include: { product: true },
              })
            : null;
          const product =
            variant?.product ??
            (body.productId
              ? await tx.product.findUnique({ where: { id: body.productId } })
              : null);

          if (!product || (body.variantId && !variant)) {
            throw new Error(
              body.variantId ? "VARIANT_NOT_FOUND" : "PRODUCT_NOT_FOUND"
            );
          }
          if (body.productId && variant && body.productId !== variant.productId) {
            throw new Error("VARIANT_PRODUCT_MISMATCH");
          }

          const previousStock = variant?.stock ?? product.stock;
          const nextStock = calculateNextStock(
            previousStock,
            body.type ?? "adjustment",
            quantity,
          );

          if (nextStock < 0) {
            throw new Error("NEGATIVE_STOCK");
          }

          if (variant) {
            const update = await tx.productVariant.updateMany({
              where: { id: variant.id, stock: previousStock },
              data: { stock: nextStock },
            });
            if (update.count !== 1) throw new Error("STOCK_CHANGED");

            const aggregate = await tx.productVariant.aggregate({
              where: { productId: product.id },
              _sum: { stock: true },
            });
            await tx.product.update({
              where: { id: product.id },
              data: { stock: aggregate._sum.stock ?? 0 },
            });
          } else {
            const update = await tx.product.updateMany({
              where: { id: product.id, stock: previousStock },
              data: { stock: nextStock },
            });
            if (update.count !== 1) throw new Error("STOCK_CHANGED");
          }

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
              variantId: variant?.id,
            },
          });

          return {
            movementId: movement.id,
            nextStock,
            previousStock,
            productId: product.id,
            variantId: variant?.id ?? null,
          };
        },
        { isolationLevel: "Serializable" }
      );

    let result;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await saveMovement();
        break;
      } catch (error) {
        const shouldRetry =
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2034") ||
          (error instanceof Error && error.message === "STOCK_CHANGED");
        if (!shouldRetry || attempt === 2) throw error;
      }
    }

    if (!result) throw new Error("STOCK_CHANGED");

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "El producto no existe." },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "VARIANT_NOT_FOUND") {
      return NextResponse.json(
        { message: "La variante no existe." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "VARIANT_PRODUCT_MISMATCH"
    ) {
      return NextResponse.json(
        { message: "La variante no pertenece al producto indicado." },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "NEGATIVE_STOCK") {
      return NextResponse.json(
        { message: "La salida no puede dejar el stock en negativo." },
        { status: 400 }
      );
    }

    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034") ||
      (error instanceof Error && error.message === "STOCK_CHANGED")
    ) {
      return NextResponse.json(
        { message: "El stock cambió durante la operación. Intenta nuevamente." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo guardar el movimiento." },
      { status: 500 }
    );
  }
}
