import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-session";
import { canTransitionOrderStatus } from "@/lib/order-status-policy";
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

  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!currentOrder) {
    return NextResponse.json({ message: "No se encontró el pedido." }, { status: 404 });
  }

  if (!canTransitionOrderStatus(currentOrder.status, body.status)) {
    return NextResponse.json(
      { message: "Cambia el estado del pedido paso a paso." },
      { status: 409 },
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
    const result = await prisma.order.updateMany({
      where: { id, status: currentOrder.status },
      data: {
        customerId:
          body.customerId === undefined ? undefined : body.customerId || null,
        notes: body.notes?.trim() || null,
        status: body.status,
      },
    });

    if (!result.count) {
      return NextResponse.json(
        { message: "El pedido cambió mientras se actualizaba. Recarga e intenta de nuevo." },
        { status: 409 },
      );
    }

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar el pedido." },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      sale: { select: { id: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { message: "No se encontro el pedido." },
      { status: 404 }
    );
  }

  if (order.sale) {
    return NextResponse.json(
      {
        message:
          "Este pedido ya esta relacionado con una venta. Para conservar el historial, no se puede eliminar.",
      },
      { status: 409 }
    );
  }

  await prisma.order.delete({ where: { id: order.id } });

  return NextResponse.json({ id: order.id });
}
