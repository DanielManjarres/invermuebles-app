import { CustomerStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
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

const validStatuses = new Set<CustomerStatus>([
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
]);

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function cleanDocument(value?: string) {
  return cleanText(value).replace(/\D/g, "");
}

function cleanPhone(value?: string) {
  return cleanText(value).replace(/\D/g, "");
}

function isValidEmail(value?: string) {
  const email = cleanText(value);
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCustomer(body: CustomerRequest) {
  if (!cleanText(body.fullName)) {
    return "Escribe el nombre completo del cliente.";
  }

  const document = cleanDocument(body.document);
  if (document.length < 6 || document.length > 15) {
    return "La cédula debe tener entre 6 y 15 números.";
  }

  const phone = cleanPhone(body.phone);
  if (phone.length < 7 || phone.length > 15) {
    return "El teléfono debe tener entre 7 y 15 números.";
  }

  const referencePhone = cleanPhone(body.referencePhone);
  if (referencePhone && (referencePhone.length < 7 || referencePhone.length > 15)) {
    return "El teléfono del contacto debe tener entre 7 y 15 números.";
  }

  if (!isValidEmail(body.email)) {
    return "Escribe un correo valido para el cliente.";
  }

  if (body.status && !validStatuses.has(body.status)) {
    return "Selecciona un estado valido para el cliente.";
  }

  return "";
}

function buildCustomerData(body: CustomerRequest) {
  return {
    address: cleanText(body.address) || null,
    city: cleanText(body.city) || null,
    document: cleanDocument(body.document),
    email: cleanText(body.email).toLowerCase() || null,
    fullName: cleanText(body.fullName),
    neighborhood: cleanText(body.neighborhood) || null,
    notes: cleanText(body.notes) || null,
    phone: cleanText(body.phone),
    referenceName: cleanText(body.referenceName) || null,
    referencePhone: cleanText(body.referencePhone) || null,
    referenceRelation: cleanText(body.referenceRelation) || null,
    status: body.status && validStatuses.has(body.status) ? body.status : "ACTIVE",
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json()) as CustomerRequest;
  const validationError = validateCustomer(body);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const document = cleanDocument(body.document);
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
  const validationError = validateCustomer(body);

  if (validationError || !body.id) {
    return NextResponse.json(
      { message: validationError || "No se encontro el cliente a editar." },
      { status: 400 }
    );
  }

  const document = cleanDocument(body.document);
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

  const hasHistory =
    customer._count.credits > 0 ||
    customer._count.orders > 0 ||
    customer._count.sales > 0;

  if (hasHistory) {
    return NextResponse.json(
      {
        message:
          "Este cliente ya tiene historial de pedidos, ventas o creditos. No se puede eliminar; puedes marcarlo como inactivo para conservar sus registros.",
      },
      { status: 409 }
    );
  }

  await prisma.customer.delete({ where: { id: customer.id } });

  return NextResponse.json({ id: customer.id, fullName: customer.fullName });
}
