import { PaymentMethod, SaleStatus, SaleType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-session";
import { getCreditById } from "@/lib/database-credits";
import { prisma } from "@/lib/prisma";
import { getFinancedSaleDeliveryStatus } from "@/lib/sale-delivery-policy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreditUpdateRequest = {
  initialPayment?: number;
  interestRate?: number;
  method?: PaymentMethod;
  months?: number;
  status?: "ACTIVE" | "OVERDUE";
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateFinancing({
  initialPayment,
  interestRate,
  saleTotal,
  saleType,
}: {
  initialPayment: number;
  interestRate: number;
  saleTotal: number;
  saleType: SaleType;
}) {
  const rate = interestRate / 100;

  if (saleType === SaleType.CREDIT_CASH) {
    if (initialPayment <= 0 || initialPayment >= saleTotal) {
      throw new Error("El pago inicial del credicontado debe ser mayor que cero y menor al total de la venta.");
    }

    const principal = roundMoney(saleTotal - initialPayment);
    const interestBalance = roundMoney(principal * rate);

    return {
      balance: roundMoney(principal + interestBalance),
      initialInterestAmount: null,
      initialPrincipalAmount: null,
      interestBalance,
      outstandingPrincipal: principal,
      principal,
      total: roundMoney(principal + principal * rate),
    };
  }

  if (saleType !== SaleType.CREDIT) {
    throw new Error("La venta seleccionada no admite financiación de cartera.");
  }

  const principal = roundMoney(saleTotal);
  const scheduledTotal = roundMoney(principal * (1 + rate));

  if (initialPayment >= scheduledTotal) {
    throw new Error("El pago inicial debe ser menor al total financiado del crédito.");
  }

  const principalPaid = roundMoney(Math.min(principal, initialPayment / (1 + rate)));
  const outstandingPrincipal = roundMoney(principal - principalPaid);
  const interestBalance = roundMoney(outstandingPrincipal * rate);

  return {
    balance: roundMoney(outstandingPrincipal + interestBalance),
    initialInterestAmount: roundMoney(initialPayment - principalPaid),
    initialPrincipalAmount: principalPaid,
    interestBalance,
    outstandingPrincipal,
    principal,
    total: scheduledTotal,
  };
}

function validateUpdate(body: CreditUpdateRequest) {
  const initialPayment = Number(body.initialPayment ?? 0);
  const interestRate = Number(body.interestRate);
  const months = Number(body.months);

  if (!Number.isFinite(initialPayment) || initialPayment < 0) {
    throw new Error("El pago inicial debe ser un valor válido.");
  }

  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("El plazo del crédito debe estar entre 1 y 120 meses.");
  }

  if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100) {
    throw new Error("El interés del crédito debe estar entre 0 % y 100 %.");
  }

  if (body.status !== "ACTIVE" && body.status !== "OVERDUE") {
    throw new Error("Selecciona un estado válido para el crédito.");
  }

  if (
    initialPayment > 0 &&
    body.method !== PaymentMethod.CASH &&
    body.method !== PaymentMethod.TRANSFER
  ) {
    throw new Error("Selecciona el medio del pago inicial.");
  }

  return { initialPayment, interestRate, months, status: body.status };
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as CreditUpdateRequest;
    const values = validateUpdate(body);

    await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        include: {
          payments: true,
          sale: { include: { payments: true } },
        },
        where: { id },
      });

      if (!credit || !credit.sale) {
        throw new Error("Crédito no encontrado.");
      }

      if (credit.status === "PAID") {
        throw new Error("Los créditos pagados no se pueden editar.");
      }

      if (credit.payments.length || credit.sale.payments.some((payment) => !payment.isInitial)) {
        throw new Error("Este crédito tiene abonos posteriores y ya no permite cambiar su financiación.");
      }

      const financing = calculateFinancing({
        initialPayment: values.initialPayment,
        interestRate: values.interestRate,
        saleTotal: Number(credit.sale.total),
        saleType: credit.sale.type,
      });

      await tx.salePayment.deleteMany({
        where: { isInitial: true, saleId: credit.sale.id },
      });

      if (values.initialPayment > 0) {
        const user = await tx.user.upsert({
          create: {
            active: true,
            email: "admin@invermuebles.com",
            name: "Administrador",
            passwordHash: "local-session",
            role: UserRole.ADMIN,
          },
          update: { active: true, name: "Administrador", role: UserRole.ADMIN },
          where: { email: "admin@invermuebles.com" },
        });

        await tx.salePayment.create({
          data: {
            amount: values.initialPayment,
            creditId: credit.sale.type === SaleType.CREDIT ? credit.id : null,
            interestAmount: financing.initialInterestAmount,
            isInitial: true,
            method: body.method!,
            note: "Pago inicial al configurar el crédito.",
            principalAmount: financing.initialPrincipalAmount,
            saleId: credit.sale.id,
            userId: user.id,
          },
        });
      }

      await tx.credit.update({
        data: {
          interestBalance: financing.interestBalance,
          interestRate: values.interestRate,
          months: values.months,
          outstandingPrincipal: financing.outstandingPrincipal,
          principal: financing.principal,
          status: values.status,
          total: financing.total,
        },
        where: { id: credit.id },
      });

      await tx.sale.update({
        data: {
          amountPaid: values.initialPayment,
          balance: financing.balance,
          paymentMethod: values.initialPayment > 0 ? body.method! : PaymentMethod.CASH,
          status: getFinancedSaleDeliveryStatus(
            values.initialPayment,
            credit.sale.status,
          ),
        },
        where: { id: credit.sale.id },
      });
    });

    const credit = await getCreditById(id);
    if (!credit) {
      return NextResponse.json(
        { message: "No fue posible consultar el crédito actualizado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ credit, message: "Crédito actualizado correctamente." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo actualizar el crédito." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;

    const saleId = await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        include: {
          payments: true,
          sale: { include: { payments: true } },
        },
        where: { id },
      });

      if (!credit || !credit.sale) {
        throw new Error("Crédito no encontrado.");
      }

      if (credit.status === "PAID") {
        throw new Error("Los créditos pagados deben conservar su historial.");
      }

      if (credit.payments.length || credit.sale.payments.some((payment) => !payment.isInitial)) {
        throw new Error("No se puede eliminar un crédito que tiene abonos posteriores.");
      }

      await tx.salePayment.deleteMany({
        where: { isInitial: true, saleId: credit.sale.id },
      });
      await tx.credit.delete({ where: { id: credit.id } });
      await tx.sale.update({
        data: {
          amountPaid: 0,
          balance: credit.sale.total,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.PENDING_PAYMENT,
        },
        where: { id: credit.sale.id },
      });

      return credit.sale.id;
    });

    return NextResponse.json({
      message: "Crédito eliminado. La venta quedó pendiente para configurar nuevamente.",
      saleId,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo eliminar el crédito." },
      { status: 400 },
    );
  }
}
