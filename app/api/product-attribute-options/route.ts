import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  canDeleteAttributeOption,
  normalizeAttributePosition,
  normalizeTaxonomyName,
  validateTaxonomyName,
} from "@/lib/product-taxonomy-policy";

type AttributeOptionRequest = {
  active?: boolean;
  attributeId?: string;
  id?: string;
  position?: number;
  value?: string;
};

async function findOptionByValue(attributeId: string, value: string) {
  return prisma.attributeOption.findFirst({
    where: {
      attributeId,
      value: { equals: value, mode: "insensitive" },
    },
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeOptionRequest;
  const value = normalizeTaxonomyName(body.value);
  const validationError = validateTaxonomyName(value, "de la opción");
  if (validationError || !body.attributeId) {
    return NextResponse.json(
      { message: validationError || "Selecciona el atributo de la opción." },
      { status: 400 },
    );
  }

  const attribute = await prisma.attributeDefinition.findUnique({
    where: { id: body.attributeId },
  });
  if (!attribute) {
    return NextResponse.json(
      { message: "No se encontró el atributo." },
      { status: 404 },
    );
  }
  if (attribute.dataType !== "OPTION") {
    return NextResponse.json(
      { message: "Solo los atributos de tipo opción admiten valores predefinidos." },
      { status: 409 },
    );
  }

  if (await findOptionByValue(attribute.id, value)) {
    return NextResponse.json(
      { message: "Esa opción ya existe en el atributo." },
      { status: 409 },
    );
  }

  try {
    const option = await prisma.attributeOption.create({
      data: {
        active: body.active ?? true,
        attributeId: attribute.id,
        position: normalizeAttributePosition(body.position),
        value,
      },
    });
    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Esa opción ya existe en el atributo." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeOptionRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica la opción que quieres actualizar." },
      { status: 400 },
    );
  }

  const option = await prisma.attributeOption.findUnique({ where: { id: body.id } });
  if (!option) {
    return NextResponse.json(
      { message: "No se encontró la opción." },
      { status: 404 },
    );
  }

  const value =
    body.value === undefined ? option.value : normalizeTaxonomyName(body.value);
  const validationError = validateTaxonomyName(value, "de la opción");
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const duplicate = await findOptionByValue(option.attributeId, value);
  if (duplicate && duplicate.id !== option.id) {
    return NextResponse.json(
      { message: "Esa opción ya existe en el atributo." },
      { status: 409 },
    );
  }

  const updatedOption = await prisma.attributeOption.update({
    where: { id: option.id },
    data: {
      active: body.active ?? option.active,
      position:
        body.position === undefined
          ? option.position
          : normalizeAttributePosition(body.position),
      value,
    },
  });

  return NextResponse.json({ option: updatedOption });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeOptionRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica la opción que quieres eliminar." },
      { status: 400 },
    );
  }

  const option = await prisma.attributeOption.findUnique({
    where: { id: body.id },
    include: { _count: { select: { selectedValues: true } } },
  });
  if (!option) {
    return NextResponse.json(
      { message: "No se encontró la opción." },
      { status: 404 },
    );
  }

  const policy = canDeleteAttributeOption(option._count);
  if (!policy.allowed) {
    return NextResponse.json({ message: policy.reason }, { status: 409 });
  }

  await prisma.attributeOption.delete({ where: { id: option.id } });
  return NextResponse.json({ id: option.id, value: option.value });
}
