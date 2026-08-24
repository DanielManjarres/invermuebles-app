import { PaymentMethod, SaleStatus, SaleType, StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { calculateReservedPayment } from "@/lib/sale-payment-policy";

type RouteContext = { params: Promise<{ id: string }> };

type PaymentRequest = {
  amount?: number;
  method?: PaymentMethod;
  note?: string;
  reference?: string;
};

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

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as PaymentRequest;
  const amount = Number(body.amount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "Ingresa un valor de abono válido." }, { status: 400 });
  }

  if (body.method !== PaymentMethod.CASH && body.method !== PaymentMethod.TRANSFER) {
    return NextResponse.json({ message: "Selecciona el medio del abono." }, { status: 400 });
  }
  const paymentMethod = body.method;

  try {
    const { id } = await context.params;
    const adminUserId = await getAdminUserId();

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.type !== SaleType.RESERVED) throw new Error("SALE_NOT_RESERVED");
      if (sale.status !== SaleStatus.PENDING_PAYMENT) throw new Error("SALE_NOT_PENDING_PAYMENT");

      const currentBalance = Number(sale.balance);
      if (amount > currentBalance) throw new Error("PAYMENT_OVER_BALANCE");

      if (!sale.stockApplied) {
        const stockItems = [...sale.items].sort((first, second) =>
          first.productId.localeCompare(second.productId),
        );

        for (const item of stockItems) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, productId: true, stock: true },
            });
            if (!variant || variant.productId !== item.productId) {
              throw new Error("VARIANT_NOT_FOUND");
            }

            const variantUpdate = await tx.productVariant.updateMany({
              where: { id: variant.id, active: true, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (!variantUpdate.count) throw new Error("OUT_OF_STOCK");

            const productUpdate = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (!productUpdate.count) throw new Error("OUT_OF_STOCK");
            const updatedVariant = await tx.productVariant.findUniqueOrThrow({
              where: { id: variant.id },
              select: { stock: true },
            });
            await tx.stockMovement.create({
              data: {
                nextStock: updatedVariant.stock,
                previousStock: updatedVariant.stock + item.quantity,
                productId: item.productId,
                variantId: variant.id,
                quantity: item.quantity,
                reason: "Inventario reservado por separado",
                note: `Venta ${sale.id}`,
                type: StockMovementType.EXIT,
                userId: adminUserId,
              },
            });
            continue;
          }

          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new Error("PRODUCT_NOT_FOUND");

          const stockUpdate = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (!stockUpdate.count) throw new Error("OUT_OF_STOCK");

          const updatedProduct = await tx.product.findUniqueOrThrow({
            where: { id: product.id },
            select: { stock: true },
          });
          const nextStock = updatedProduct.stock;
          await tx.stockMovement.create({
            data: {
              nextStock,
              previousStock: nextStock + item.quantity,
              productId: product.id,
              quantity: item.quantity,
              reason: "Inventario reservado por separado",
              note: `Venta ${sale.id}`,
              type: StockMovementType.EXIT,
              userId: adminUserId,
            },
          });
        }
      }

      const paymentResult = calculateReservedPayment(
        currentBalance,
        Number(sale.amountPaid),
        amount,
      );
      const nextBalance = paymentResult.balance;
      const nextAmountPaid = paymentResult.amountPaid;
      const nextStatus = paymentResult.status;

      const payment = await tx.salePayment.create({
        data: {
          amount,
          method: paymentMethod,
          note: body.note?.trim() || null,
          reference: body.reference?.trim() || null,
          saleId: sale.id,
          userId: adminUserId,
        },
      });

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          amountPaid: nextAmountPaid,
          balance: nextBalance,
          paymentMethod,
          status: nextStatus,
          stockApplied: true,
        },
      });

      return {
        amountPaid: nextAmountPaid,
        balance: nextBalance,
        payment: {
          id: payment.id,
          amount: Number(payment.amount),
          createdAt: payment.createdAt.toLocaleString("es-CO", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Bogota",
          }),
          createdAtISO: payment.createdAt.toISOString(),
          isInitial: payment.isInitial,
          method: payment.method,
          note: payment.note ?? "",
          reference: payment.reference ?? "",
          userName: "Administrador",
        },
        status: nextStatus,
      };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ...result, message: "Abono registrado correctamente." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, [string, number]> = {
      SALE_NOT_FOUND: ["No se encontró la venta.", 404],
      SALE_NOT_RESERVED: ["La venta seleccionada no corresponde a un separado.", 409],
      SALE_NOT_PENDING_PAYMENT: ["Esta venta ya no admite abonos pendientes.", 409],
      PAYMENT_OVER_BALANCE: ["El abono no puede superar el saldo pendiente.", 400],
      PRODUCT_NOT_FOUND: ["No se encontró uno de los productos del separado.", 404],
      VARIANT_NOT_FOUND: ["No se encontró una de las variantes del separado.", 404],
      OUT_OF_STOCK: ["No hay existencias suficientes para conservar este separado.", 409],
    };
    const [message, status] = errors[code] ?? ["No se pudo registrar el abono.", 500];
    return NextResponse.json({ message }, { status });
  }
}
