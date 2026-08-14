import { CustomerStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  canDeleteCustomer,
  isEditableCustomerStatus,
  normalizeCustomerDocument,
  validateCustomerInput,
} from "@/lib/customer-policy";
import { prisma } from "@/lib/prisma";

type CustomerRequest = {
  address?: string;
  city?: string;
  document?: string;
  email?: string;
  fullName?: string;
  id?: string;
  neighborhood?: string;
  notes?: string;
  phone?: string;
  referenceName?: string;
  referencePhone?: string;
  referenceRelation?: string;
  status?: CustomerStatus;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function buildCustomerData(body: CustomerRequest) {
  return {
    address: cleanText(body.address) || null,
    city: cleanText(body.city) || null,
    document: normalizeCustomerDocument(body.document),
    email: cleanText(body.email).toLowerCase() || null,
    fullName: cleanText(body.fullName),
    neighborhood: cleanText(body.neighborhood) || null,
    notes: cleanText(body.notes) || null,
    phone: cleanText(body.phone),
    referenceName: cleanText(body.referenceName) || null,
    referencePhone: cleanText(body.referencePhone) || null,
    referenceRelation: cleanText(body.referenceRelation) || null,
    status: isEditableCustomerStatus(body.status) ? body.status : "ACTIVE",
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as CustomerRequest;
  const validationError = validateCustomerInput(body);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const document = normalizeCustomerDocument(body.document);
  const existingCustomer = await prisma.customer.findUnique({
    where: { document },
  });

  if (existingCustomer) {
    return NextResponse.json(
      { message: "Ya existe un cliente con esa cédula." },
      { status: 409 }
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: buildCustomerData(body),
    });

    return NextResponse.json({ id: customer.id }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe un cliente con esa cédula." },
        { status: 409 }
      );
    }

    throw error;
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as CustomerRequest;
  const validationError = validateCustomerInput(body);

  if (validationError || !body.id) {
    return NextResponse.json(
      { message: validationError || "No se encontro el cliente a editar." },
      { status: 400 }
    );
  }

  const document = normalizeCustomerDocument(body.document);
  const customerWithSameDocument = await prisma.customer.findUnique({
    where: { document },
  });

  if (customerWithSameDocument && customerWithSameDocument.id !== body.id) {
    return NextResponse.json(
      { message: "Ya existe otro cliente con esa cédula." },
      { status: 409 }
    );
  }

  try {
    await prisma.customer.update({
      where: { id: body.id },
      data: buildCustomerData(body),
    });

    return NextResponse.json({ id: body.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { message: "No se encontró el cliente." },
          { status: 404 }
        );
      }

      if (error.code === "P2002") {
        return NextResponse.json(
          { message: "Ya existe otro cliente con esa cédula." },
          { status: 409 }
        );
      }
    }

    throw error;
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return NextResponse.json(
      { message: "No se encontro el cliente a eliminar." },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: body.id },
    select: {
      id: true,
      fullName: true,
      _count: {
        select: {
          credits: true,
          orders: true,
          sales: true,
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "No se encontro el cliente." },
      { status: 404 }
    );
  }

  const deletionPolicy = canDeleteCustomer(customer._count);

  if (!deletionPolicy.allowed) {
    return NextResponse.json(
      { message: deletionPolicy.reason },
      { status: 409 }
    );
  }

  await prisma.customer.delete({ where: { id: customer.id } });

  return NextResponse.json({ id: customer.id, fullName: customer.fullName });
}
