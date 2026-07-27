import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

type OrderUpdateRequest = {
  customerId?: string | null;
  notes?: string;
  status?: OrderStatus;
};

const allowedStatuses = new Set<OrderStatus>([
  OrderStatus.PENDING,
  OrderStatus.CONTACTED,
  OrderStatus.CONFIRMED,
  OrderStatus.CANCELLED,
]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await params;
  const body = (await request.json()) as OrderUpdateRequest;

  if (!body.status || !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      { message: "Selecciona un estado valido para el pedido." },
      { status: 400 }
    );
  }

  if (body.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { message: "Selecciona un cliente valido para el pedido." },
        { status: 400 }
      );
    }
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        customerId:
          body.customerId === undefined ? undefined : body.customerId || null,
        notes: body.notes?.trim() || null,
        status: body.status,
      },
    });

    return NextResponse.json({ id: order.id });
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar el pedido." },
      { status: 404 }
    );
  }
}
