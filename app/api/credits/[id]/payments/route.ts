import { PaymentMethod, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { getCreditById } from "@/lib/database-credits";
import { prisma } from "@/lib/prisma";
import { consumePaymentReceiptNumber } from "@/lib/document-numbering";
import { getFinancedSaleDeliveryStatus } from "@/lib/sale-delivery-policy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PaymentRequest = {
  amount?: number;
  method?: PaymentMethod;
  note?: string;
  reference?: string;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function splitPayment({
  amount,
  interestBalance,
  interestRate,
  outstandingPrincipal,
}: {
  amount: number;
  interestBalance: number;
  interestRate: number;
  outstandingPrincipal: number;
}) {
  const balance = outstandingPrincipal + interestBalance;

  if (amount >= balance) {
    return {
      interestAmount: roundMoney(interestBalance),
      nextInterestBalance: 0,
      nextOutstandingPrincipal: 0,
      principalAmount: roundMoney(outstandingPrincipal),
    };
  }

  const rate = interestRate / 100;
  const principalAmount = Math.min(outstandingPrincipal, amount / (1 + rate));
  const interestAmount = amount - principalAmount;
  const nextOutstandingPrincipal = Math.max(
    0,
    outstandingPrincipal - principalAmount
  );
  const nextInterestBalance = nextOutstandingPrincipal * rate;

  return {
    interestAmount: roundMoney(interestAmount),
    nextInterestBalance: roundMoney(nextInterestBalance),
    nextOutstandingPrincipal: roundMoney(nextOutstandingPrincipal),
    principalAmount: roundMoney(principalAmount),
  };
}

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const body = (await request.json()) as PaymentRequest;
  const amount = Number(body.amount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { message: "Ingresa un valor de abono válido." },
      { status: 400 }
    );
  }

  if (body.method !== "CASH" && body.method !== "TRANSFER") {
    return NextResponse.json(
      { message: "Selecciona el medio del pago." },
      { status: 400 }
    );
  }


  const paymentMethod = body.method;

  try {
    const updatedCredit = await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        include: {
          sale: true,
        },
        where: { id },
      });

      if (!credit || !credit.sale) {
        throw new Error("Crédito no encontrado.");
      }

      if (credit.status === "PAID") {
        throw new Error("Este crédito no permite nuevos abonos.");
      }

      const outstandingPrincipal = Number(credit.outstandingPrincipal);
      const interestBalance = Number(credit.interestBalance);
      const balance = outstandingPrincipal + interestBalance;

      if (amount > balance) {
        throw new Error("El abono no puede ser mayor al saldo pendiente.");
      }

      const payment = splitPayment({
        amount,
        interestBalance,
        interestRate: Number(credit.interestRate),
        outstandingPrincipal,
      });
      const nextBalance =
        payment.nextOutstandingPrincipal + payment.nextInterestBalance;
      const isPaid = nextBalance <= 0;
      const user = await tx.user.upsert({
        create: {
          active: true,
          email: "admin@invermuebles.com",
          name: "Administrador",
          passwordHash: "local-session",
          role: UserRole.ADMIN,
        },
        update: {
          active: true,
          name: "Administrador",
          role: UserRole.ADMIN,
        },
        where: { email: "admin@invermuebles.com" },
      });

      const receiptNumber = await consumePaymentReceiptNumber(tx);
      await tx.salePayment.create({
        data: {
          amount,
          creditId: credit.id,
          interestAmount: payment.interestAmount,
          method: paymentMethod,
          note: body.note?.trim() || null,
          principalAmount: payment.principalAmount,
          reference: body.reference?.trim() || null,
          receiptNumber,
          saleId: credit.sale.id,
          userId: user.id,
        },
      });

      await tx.credit.update({
        data: {
          interestBalance: payment.nextInterestBalance,
          outstandingPrincipal: payment.nextOutstandingPrincipal,
          status: isPaid ? "PAID" : "ACTIVE",
        },
        where: { id: credit.id },
      });

      await tx.sale.update({
        data: {
          amountPaid: {
            increment: amount,
          },
          balance: nextBalance,
          status: getFinancedSaleDeliveryStatus(
            Number(credit.sale.amountPaid) + amount,
            credit.sale.status,
          ),
        },
        where: { id: credit.sale.id },
      });

      return credit.id;
    });

    const credit = await getCreditById(updatedCredit);

    if (!credit) {
      return NextResponse.json(
        { message: "No fue posible consultar el crédito actualizado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credit,
      message: "Abono registrado en cartera.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible registrar el abono.",
      },
      { status: 400 }
    );
  }
}
