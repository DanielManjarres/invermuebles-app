import { StockMovementType, UserRole } from "@prisma/client";
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

export async function PATCH(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const result = await prisma.sale.updateMany({
      where: { id, status: "PENDING_DELIVERY" },
      data: { status: "DELIVERED" },
    });

    if (!result.count) {
      const sale = await prisma.sale.findUnique({
        where: { id },
        select: { id: true },
      });

      return NextResponse.json(
        {
          message: sale
            ? "Solo una venta pendiente de entrega puede marcarse como entregada."
            : "No se encontró la venta.",
        },
        { status: sale ? 409 : 404 },
      );
    }

    return NextResponse.json({
      id,
      message: "Venta marcada como entregada.",
      status: "DELIVERED",
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo confirmar la entrega de la venta." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const adminUserId = await getAdminUserId();

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        select: {
          credit: {
            select: {
              id: true,
              payments: { select: { id: true } },
            },
          },
          id: true,
          items: { select: { productId: true, quantity: true } },
          orderId: true,
          payments: { select: { isInitial: true } },
          status: true,
          stockApplied: true,
        },
      });

      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.status === "CANCELLED") throw new Error("SALE_CANCELLED");

      const hasLaterCreditPayments = Boolean(
        sale.credit &&
          (sale.credit.payments.length || sale.payments.some((payment) => !payment.isInitial)),
      );
      if (hasLaterCreditPayments) throw new Error("CREDIT_HAS_PAYMENTS");

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
              reason: "Devolución por eliminación de venta",
              note: `Venta ${sale.id} eliminada permanentemente por corrección administrativa.`,
              type: StockMovementType.ENTRY,
              userId: adminUserId,
            },
          });
        }
      }

      if (sale.credit) {
        await tx.credit.delete({ where: { id: sale.credit.id } });
      }

      if (sale.orderId) {
        await tx.order.update({
          where: { id: sale.orderId },
          data: { status: "CONTACTED" },
        });
      }

      await tx.sale.delete({ where: { id: sale.id } });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      id,
      message: "Venta eliminada permanentemente y existencias devueltas al inventario.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "SALE_NOT_FOUND") {
      return NextResponse.json({ message: "No se encontró la venta." }, { status: 404 });
    }

    if (message === "SALE_CANCELLED") {
      return NextResponse.json(
        { message: "Esta venta ya estaba anulada y no puede eliminarse desde este flujo." },
        { status: 409 },
      );
    }

    if (message === "CREDIT_HAS_PAYMENTS") {
      return NextResponse.json(
        { message: "No se puede eliminar una venta con abonos posteriores al pago inicial." },
        { status: 409 },
      );
    }

    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { message: "No se encontró uno de los productos de la venta." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "No se pudo eliminar la venta." },
      { status: 500 },
    );
  }
}
