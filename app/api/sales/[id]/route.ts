import { CreditStatus, StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    select: {
      id: true,
      credit: { select: { id: true } },
      items: { select: { productId: true, quantity: true } },
      notes: true,
      orderId: true,
      status: true,
      stockApplied: true,
    },
  });

  if (!sale) {
    return NextResponse.json(
      { message: "No se encontro la venta." },
      { status: 404 }
    );
  }

  if (sale.status === "CANCELLED") {
    return NextResponse.json(
      { message: "Esta venta ya fue anulada." },
      { status: 409 }
    );
  }

  try {
    const adminUserId = await getAdminUserId();

    await prisma.$transaction(async (tx) => {
      if (sale.stockApplied) {
        for (const item of sale.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, stock: true },
          });

          if (!product) {
            throw new Error("PRODUCT_NOT_FOUND");
          }

          const nextStock = product.stock + item.quantity;
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
              reason: "Devolucion por anulacion de venta",
              note: `Venta ${sale.id} anulada por correccion administrativa.`,
              type: StockMovementType.ENTRY,
              userId: adminUserId,
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          balance: 0,
          notes: [sale.notes, "Venta anulada por correccion administrativa."]
            .filter(Boolean)
            .join(" "),
          status: "CANCELLED",
          stockApplied: false,
        },
      });

      if (sale.credit) {
        await tx.credit.update({
          where: { id: sale.credit.id },
          data: {
            interestBalance: 0,
            outstandingPrincipal: 0,
            status: CreditStatus.CANCELLED,
          },
        });
      }

      if (sale.orderId) {
        await tx.order.update({
          where: { id: sale.orderId },
          data: { status: "CANCELLED" },
        });
      }
    });

    return NextResponse.json({
      id: sale.id,
      message: "Venta anulada y movimientos de devolucion registrados.",
      status: "CANCELLED",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "No se encontro uno de los productos de la venta." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo anular la venta." },
      { status: 500 }
    );
  }
}
