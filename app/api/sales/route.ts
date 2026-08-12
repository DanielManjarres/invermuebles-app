import {
  OrderStatus,
  PaymentMethod,
  SaleSource,
  SaleStatus,
  SaleType,
  StockMovementType,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type SaleItemRequest = {
  productId?: string;
  quantity?: number;
  unitPrice?: number;
};

type SaleRequest = {
  customerId?: string;
  items?: SaleItemRequest[];
  notes?: string;
  orderId?: string;
  paymentMethod?: PaymentMethod;
  initialPayment?: number;
  type?: SaleType;
  creditMonths?: number;
  interestRate?: number;
  sistecreditoApproval?: string;
};

const allowedSaleTypes = new Set<SaleType>(Object.values(SaleType));
const financingTypes = new Set<SaleType>([SaleType.CREDIT, SaleType.CREDIT_CASH]);

function normalizeItems(items: SaleItemRequest[] = []) {
  const itemMap = new Map<string, { productId: string; quantity: number; unitPrice: number }>();

  for (const item of items) {
    const productId = item.productId?.trim() ?? "";
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      continue;
    }

    itemMap.set(productId, { productId, quantity, unitPrice });
  }

  return Array.from(itemMap.values());
}

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

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as SaleRequest;
  const saleType = allowedSaleTypes.has(body.type as SaleType)
    ? (body.type as SaleType)
    : SaleType.CASH;
  const initialPayment = Number(body.initialPayment ?? 0);
  const paymentMethod = body.paymentMethod;
  const months = Number(body.creditMonths ?? 6);
  const requestedInterestRate = Number(body.interestRate ?? 20);

  if (!body.customerId?.trim()) {
    return NextResponse.json(
      { message: "Toda venta debe quedar asociada a un cliente." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(initialPayment) || initialPayment < 0) {
    return NextResponse.json(
      { message: "El pago inicial debe ser un valor válido." },
      { status: 400 }
    );
  }

  if (
    financingTypes.has(saleType) &&
    (!Number.isInteger(months) || months < 1 || months > 120)
  ) {
    return NextResponse.json(
      { message: "El plazo del crédito debe estar entre 1 y 120 meses." },
      { status: 400 }
    );
  }

  if (
    financingTypes.has(saleType) &&
    (!Number.isFinite(requestedInterestRate) ||
      requestedInterestRate < 0 ||
      requestedInterestRate > 100)
  ) {
    return NextResponse.json(
      { message: "El interés del crédito debe estar entre 0 % y 100 %." },
      { status: 400 }
    );
  }

  if (
    initialPayment > 0 &&
    paymentMethod !== PaymentMethod.CASH &&
    paymentMethod !== PaymentMethod.TRANSFER
  ) {
    return NextResponse.json(
      { message: "Selecciona efectivo o transferencia para registrar el pago inicial." },
      { status: 400 }
    );
  }

  try {
    const adminUserId = await getAdminUserId();

    const sale = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: body.customerId!.trim() },
        select: { id: true, status: true },
      });

      if (!customer) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }

      if (customer.status === "INACTIVE" || customer.status === "BLOCKED") {
        throw new Error("CUSTOMER_UNAVAILABLE");
      }

      const orderId = body.orderId?.trim() || null;
      let items = normalizeItems(body.items);

      if (orderId) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true, sale: true },
        });

        if (!order) throw new Error("ORDER_NOT_FOUND");
        if (order.status !== OrderStatus.CONFIRMED) throw new Error("ORDER_NOT_CONFIRMED");
        if (order.sale) throw new Error("ORDER_ALREADY_SOLD");

        const requestedPrices = new Map(items.map((item) => [item.productId, item.unitPrice]));
        items = order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: requestedPrices.get(item.productId) ?? 0,
        }));
      }

      if (items.length === 0) throw new Error("EMPTY_SALE");

      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
        include: { productClass: true, productType: true },
      });

      if (products.length !== items.length) throw new Error("PRODUCT_NOT_FOUND");

      const productsById = new Map(products.map((product) => [product.id, product]));
      const saleItems = items.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) throw new Error("PRODUCT_NOT_FOUND");
        if (product.stock < item.quantity) {
          throw new Error(`OUT_OF_STOCK:${product.name}:${product.stock}`);
        }

        const unitPrice = item.unitPrice || Number(product.salePrice);
        return {
          cost: product.cost,
          lineTotal: unitPrice * item.quantity,
          productCategory: product.productType.name,
          productClass: product.productClass.name,
          productId: product.id,
          productName: product.name,
          productReference: product.reference,
          quantity: item.quantity,
          unitPrice,
        };
      });
      const total = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);

      let amountPaid = initialPayment;
      let balance = 0;
      let status: SaleStatus = SaleStatus.PENDING_DELIVERY;
      let stockApplied = true;
      let reservedUntil: Date | null = null;
      let interestRate = 0;
      let principal = 0;
      let outstandingPrincipal = 0;
      let interestBalance = 0;

      if (saleType === SaleType.CASH) {
        amountPaid = initialPayment || total;
        if (amountPaid !== total) throw new Error("CASH_PAYMENT_INCOMPLETE");
      }

      if (saleType === SaleType.SISTECREDITO) {
        if (!body.sistecreditoApproval?.trim()) throw new Error("SISTECREDITO_APPROVAL_REQUIRED");
        amountPaid = total;
      }

      if (saleType === SaleType.RESERVED) {
        const minimumPayment = total * 0.1;
        if (amountPaid < minimumPayment) throw new Error("RESERVED_MINIMUM_PAYMENT");
        if (amountPaid > total) throw new Error("PAYMENT_OVER_TOTAL");
        balance = total - amountPaid;
        status = balance === 0 ? SaleStatus.PENDING_DELIVERY : SaleStatus.PENDING_PAYMENT;
        reservedUntil = new Date();
        reservedUntil.setMonth(reservedUntil.getMonth() + 3);
      }

      if (financingTypes.has(saleType)) {
        if (saleType === SaleType.CREDIT_CASH && amountPaid <= 0) {
          throw new Error("CREDIT_CASH_INITIAL_REQUIRED");
        }

        const financedAmount = saleType === SaleType.CREDIT ? total : total - amountPaid;
        if (financedAmount <= 0) throw new Error("PAYMENT_OVER_TOTAL");

        interestRate = requestedInterestRate / 100;
        principal = financedAmount;
        const scheduledTotal = financedAmount * (1 + interestRate);
        if (
          (saleType === SaleType.CREDIT && amountPaid > scheduledTotal) ||
          (saleType === SaleType.CREDIT_CASH && amountPaid > total)
        ) {
          throw new Error("PAYMENT_OVER_TOTAL");
        }
        const creditPayment = saleType === SaleType.CREDIT ? amountPaid : 0;
        const principalPaid = Math.min(principal, creditPayment / (1 + interestRate));
        outstandingPrincipal = principal - principalPaid;
        interestBalance = outstandingPrincipal * interestRate;
        balance = outstandingPrincipal + interestBalance;
        status = SaleStatus.PENDING_DELIVERY;
      }

      if (saleType !== SaleType.CREDIT && saleType !== SaleType.CREDIT_CASH && saleType !== SaleType.RESERVED) {
        if (amountPaid > total) throw new Error("PAYMENT_OVER_TOTAL");
        balance = Math.max(total - amountPaid, 0);
      }

      const sale = await tx.sale.create({
        data: {
          amountPaid,
          balance,
          customerId: customer.id,
          items: { create: saleItems },
          notes: body.notes?.trim() || null,
          orderId,
          paymentMethod:
            saleType === SaleType.SISTECREDITO ? "SISTECREDITO" : paymentMethod ?? "CASH",
          reservedUntil,
          sistecreditoApproval: body.sistecreditoApproval?.trim() || null,
          source: orderId ? SaleSource.ORDER : SaleSource.LOCAL,
          status,
          stockApplied,
          total,
          type: saleType,
          credit: financingTypes.has(saleType)
            ? {
                create: {
                  customerId: customer.id,
                  interestBalance,
                  interestRate: interestRate * 100,
                  months,
                  outstandingPrincipal,
                  principal,
                  total: principal + principal * interestRate,
                },
              }
            : undefined,
        },
        include: { credit: true },
      });

      if (amountPaid > 0 && saleType !== SaleType.SISTECREDITO && paymentMethod) {
        await tx.salePayment.create({
          data: {
            amount: amountPaid,
            creditId: saleType === SaleType.CREDIT ? sale.credit?.id : null,
            interestAmount:
              saleType === SaleType.CREDIT
                ? amountPaid - (principal - outstandingPrincipal)
                : null,
            isInitial: financingTypes.has(saleType),
            method: paymentMethod,
            note: "Pago inicial al registrar la venta.",
            principalAmount:
              saleType === SaleType.CREDIT ? principal - outstandingPrincipal : null,
            saleId: sale.id,
            userId: adminUserId,
          },
        });
      }

      if (stockApplied) {
        const stockItems = [...saleItems].sort((first, second) =>
          first.productId.localeCompare(second.productId),
        );

        for (const item of stockItems) {
          const product = productsById.get(item.productId)!;
          const stockUpdate = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });

          if (!stockUpdate.count) {
            const currentProduct = await tx.product.findUnique({
              where: { id: product.id },
              select: { stock: true },
            });
            throw new Error(`OUT_OF_STOCK:${product.name}:${currentProduct?.stock ?? 0}`);
          }

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
              reason: orderId ? "Venta desde pedido confirmado" : `Venta ${saleType}`,
              note: body.notes?.trim() || null,
              type: StockMovementType.EXIT,
              userId: adminUserId,
            },
          });
        }
      }

      return sale;
    });

    return NextResponse.json(
      {
        id: sale.id,
        message: "Venta registrada correctamente.",
        status: sale.status,
        total: Number(sale.total),
        amountPaid: Number(sale.amountPaid),
        balance: Number(sale.balance),
        stockApplied: sale.stockApplied,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, [string, number]> = {
      CUSTOMER_NOT_FOUND: ["Selecciona un cliente válido para la venta.", 400],
      CUSTOMER_UNAVAILABLE: ["El cliente está inactivo o bloqueado para nuevas ventas.", 400],
      EMPTY_SALE: ["Agrega al menos un producto a la venta.", 400],
      PRODUCT_NOT_FOUND: ["Uno de los productos no existe.", 404],
      ORDER_NOT_FOUND: ["El pedido seleccionado no existe.", 404],
      ORDER_NOT_CONFIRMED: ["Solo se puede preparar una venta desde pedidos confirmados.", 400],
      ORDER_ALREADY_SOLD: ["Este pedido ya fue convertido en venta.", 400],
      PAYMENT_OVER_TOTAL: ["El pago inicial no puede ser mayor al valor de la venta.", 400],
      CASH_PAYMENT_INCOMPLETE: ["En contado el pago debe cubrir el total de la venta.", 400],
      RESERVED_MINIMUM_PAYMENT: ["Para separar se debe registrar al menos el 10 % del valor.", 400],
      CREDIT_CASH_INITIAL_REQUIRED: ["Credicontado requiere un pago inicial mayor a cero.", 400],
      SISTECREDITO_APPROVAL_REQUIRED: ["Registra el número de aprobación de Sistecrédito.", 400],
    };

    if (errors[message]) {
      const [detail, status] = errors[message];
      return NextResponse.json({ message: detail }, { status });
    }

    if (message.startsWith("OUT_OF_STOCK:")) {
      const [, name, stock] = message.split(":");
      return NextResponse.json(
        { message: `No hay stock suficiente de ${name}. Disponible: ${stock}.` },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "No se pudo registrar la venta." }, { status: 500 });
  }
}
