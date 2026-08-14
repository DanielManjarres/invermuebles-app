import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-session";
import { canChangeOrderStructure, canDeleteOrder } from "@/lib/order-policy";
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

  if (body.status !== undefined && !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      { message: "Selecciona un estado valido para el pedido." },
      { status: 400 }
    );
  }

  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { customerId: true, sale: { select: { id: true } }, status: true },
  });

  if (!currentOrder) {
    return NextResponse.json({ message: "No se encontró el pedido." }, { status: 404 });
  }

  const nextStatus = body.status ?? currentOrder.status;

  if (!canTransitionOrderStatus(currentOrder.status, nextStatus)) {
    return NextResponse.json(
      { message: "Cambia el estado del pedido paso a paso." },
      { status: 409 },
    );
  }

  const requestedCustomerId = body.customerId === undefined
    ? currentOrder.status === "PENDING" ? null : currentOrder.customerId
    : body.customerId || null;
  const nextCustomerId = nextStatus === "PENDING" ? null : requestedCustomerId;
  const shouldClearCustomer = nextStatus === "PENDING" || (
    currentOrder.status === "PENDING" && body.customerId === undefined
  );

  if (nextStatus === "PENDING" && body.customerId) {
    return NextResponse.json(
      { message: "Primero marca el pedido como contactado para asociar un cliente." },
      { status: 409 },
    );
  }

  if (nextStatus === "CONFIRMED" && !nextCustomerId) {
    return NextResponse.json(
      { message: "Asocia un cliente antes de confirmar el pedido." },
      { status: 409 },
    );
  }

  if (!canChangeOrderStructure(
    Boolean(currentOrder.sale),
    currentOrder.status,
    nextStatus,
    currentOrder.customerId,
    nextCustomerId,
  )) {
    return NextResponse.json(
      { message: "El estado y el cliente no pueden cambiar porque el pedido ya tiene una venta." },
      { status: 409 },
    );
  }

  if (body.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      select: { id: true, status: true },
    });

    if (!customer || customer.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Selecciona un cliente activo para el pedido." },
        { status: 400 }
      );
    }
  }

  try {
    const result = await prisma.order.updateMany({
      where: { id, status: currentOrder.status },
      data: {
        customerId: shouldClearCustomer
          ? null
          : body.customerId === undefined ? undefined : body.customerId || null,
        notes: body.notes === undefined ? undefined : body.notes.trim() || null,
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

  if (!canDeleteOrder(Boolean(order.sale))) {
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
