import { PaymentMethod, SaleStatus, SaleType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreditConfigurationRequest = {
  initialPayment?: number;
  interestRate?: number;
  method?: PaymentMethod;
  months?: number;
  status?: "ACTIVE" | "OVERDUE";
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as CreditConfigurationRequest;
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

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        include: { credit: true, payments: true },
        where: { id },
      });

      if (!sale) throw new Error("Venta no encontrada.");
      if (sale.credit) throw new Error("La venta ya tiene un crédito configurado.");
      if (sale.type !== SaleType.CREDIT && sale.type !== SaleType.CREDIT_CASH) {
        throw new Error("La venta seleccionada no admite financiación de cartera.");
      }
      if (!sale.customerId) throw new Error("La venta debe conservar un cliente para crear el crédito.");
      if (sale.payments.length) {
        throw new Error("La venta tiene pagos registrados y no permite recrear la financiación.");
      }

      const saleTotal = Number(sale.total);
      const rate = interestRate / 100;
      let principal = saleTotal;
      let outstandingPrincipal = saleTotal;
      let interestBalance = 0;
      let initialPrincipalAmount: number | null = null;
      let initialInterestAmount: number | null = null;

      if (sale.type === SaleType.CREDIT_CASH) {
        if (initialPayment <= 0 || initialPayment >= saleTotal) {
          throw new Error("El pago inicial del credicontado debe ser mayor que cero y menor al total de la venta.");
        }
        principal = roundMoney(saleTotal - initialPayment);
        outstandingPrincipal = principal;
        interestBalance = roundMoney(principal * rate);
      } else {
        const scheduledTotal = roundMoney(principal * (1 + rate));
        if (initialPayment >= scheduledTotal) {
          throw new Error("El pago inicial debe ser menor al total financiado del crédito.");
        }
        const principalPaid = roundMoney(Math.min(principal, initialPayment / (1 + rate)));
        outstandingPrincipal = roundMoney(principal - principalPaid);
        interestBalance = roundMoney(outstandingPrincipal * rate);
        initialPrincipalAmount = principalPaid;
        initialInterestAmount = roundMoney(initialPayment - principalPaid);
      }

      const balance = roundMoney(outstandingPrincipal + interestBalance);
      const credit = await tx.credit.create({
        data: {
          customerId: sale.customerId,
          interestBalance,
          interestRate,
          months,
          outstandingPrincipal,
          principal,
          saleId: sale.id,
          status: body.status,
          total: roundMoney(principal * (1 + rate)),
        },
      });

      if (initialPayment > 0) {
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
            amount: initialPayment,
            creditId: sale.type === SaleType.CREDIT ? credit.id : null,
            interestAmount: initialInterestAmount,
            isInitial: true,
            method: body.method!,
            note: "Pago inicial al configurar el crédito.",
            principalAmount: initialPrincipalAmount,
            saleId: sale.id,
            userId: user.id,
          },
        });
      }

      await tx.sale.update({
        data: {
          amountPaid: initialPayment,
          balance,
          paymentMethod: initialPayment > 0 ? body.method! : PaymentMethod.CASH,
          status: SaleStatus.PENDING_DELIVERY,
        },
        where: { id: sale.id },
      });

      return { balance, creditId: credit.id };
    });

    return NextResponse.json({
      ...result,
      amountPaid: initialPayment,
      creditMonths: months,
      interestRate,
      message: "Crédito configurado nuevamente.",
      status: SaleStatus.PENDING_DELIVERY,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No se pudo configurar el crédito." },
      { status: 400 },
    );
  }
}
