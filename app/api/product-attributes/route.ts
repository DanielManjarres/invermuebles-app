import { Prisma, ProductAttributeDataType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  canChangeAttributeDataType,
  canDeleteAttribute,
  createAttributeKey,
  normalizeAttributePosition,
  normalizeTaxonomyName,
  validateAttributeDefinition,
} from "@/lib/product-taxonomy-policy";

type AttributeRequest = {
  active?: boolean;
  dataType?: ProductAttributeDataType;
  id?: string;
  key?: string;
  name?: string;
  position?: number;
  productTypeId?: string;
  required?: boolean;
  unit?: string;
};

async function findAttributeByKey(productTypeId: string, key: string) {
  return prisma.attributeDefinition.findUnique({
    where: { productTypeId_key: { key, productTypeId } },
  });
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const productTypeId = new URL(request.url).searchParams.get("productTypeId");
  if (!productTypeId) {
    return NextResponse.json(
      { message: "Indica el tipo de producto que quieres consultar." },
      { status: 400 },
    );
  }

  const attributes = await prisma.attributeDefinition.findMany({
    where: { productTypeId },
    include: {
      options: { orderBy: [{ position: "asc" }, { value: "asc" }] },
      _count: { select: { values: true } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ attributes });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeRequest;
  const name = normalizeTaxonomyName(body.name);
  const key = createAttributeKey(body.key || name);
  const unit = normalizeTaxonomyName(body.unit);
  const validationError = validateAttributeDefinition({
    dataType: body.dataType,
    key,
    name,
    unit,
  });

  if (validationError || !body.productTypeId) {
    return NextResponse.json(
      {
        message:
          validationError || "Selecciona el tipo de producto del atributo.",
      },
      { status: 400 },
    );
  }

  const productType = await prisma.catalogProductType.findUnique({
    where: { id: body.productTypeId },
  });
  if (!productType) {
    return NextResponse.json(
      { message: "No se encontró el tipo de producto." },
      { status: 404 },
    );
  }

  if (await findAttributeByKey(productType.id, key)) {
    return NextResponse.json(
      { message: "Ya existe un atributo con esa clave en el tipo de producto." },
      { status: 409 },
    );
  }

  try {
    const attribute = await prisma.attributeDefinition.create({
      data: {
        active: body.active ?? true,
        dataType: body.dataType!,
        key,
        name,
        position: normalizeAttributePosition(body.position),
        productTypeId: productType.id,
        required: body.required ?? false,
        unit: body.dataType === "NUMBER" && unit ? unit : null,
      },
    });
    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe un atributo con esa clave en el tipo de producto." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica el atributo que quieres actualizar." },
      { status: 400 },
    );
  }

  const attribute = await prisma.attributeDefinition.findUnique({
    where: { id: body.id },
    include: { _count: { select: { options: true, values: true } } },
  });
  if (!attribute) {
    return NextResponse.json(
      { message: "No se encontró el atributo." },
      { status: 404 },
    );
  }

  const name =
    body.name === undefined
      ? attribute.name
      : normalizeTaxonomyName(body.name);
  const key =
    body.key === undefined ? attribute.key : createAttributeKey(body.key);
  const dataType = body.dataType ?? attribute.dataType;
  const unit =
    body.unit === undefined
      ? attribute.unit ?? ""
      : normalizeTaxonomyName(body.unit);
  const validationError = validateAttributeDefinition({
    dataType,
    key,
    name,
    unit,
  });
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  if (dataType !== attribute.dataType) {
    const policy = canChangeAttributeDataType(attribute._count);
    if (!policy.allowed) {
      return NextResponse.json({ message: policy.reason }, { status: 409 });
    }
  }

  const duplicate = await findAttributeByKey(attribute.productTypeId, key);
  if (duplicate && duplicate.id !== attribute.id) {
    return NextResponse.json(
      { message: "Ya existe un atributo con esa clave en el tipo de producto." },
      { status: 409 },
    );
  }

  const updatedAttribute = await prisma.attributeDefinition.update({
    where: { id: attribute.id },
    data: {
      active: body.active ?? attribute.active,
      dataType,
      key,
      name,
      position:
        body.position === undefined
          ? attribute.position
          : normalizeAttributePosition(body.position),
      required: body.required ?? attribute.required,
      unit: dataType === "NUMBER" && unit ? unit : null,
    },
  });

  return NextResponse.json({ attribute: updatedAttribute });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as AttributeRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica el atributo que quieres eliminar." },
      { status: 400 },
    );
  }

  const attribute = await prisma.attributeDefinition.findUnique({
    where: { id: body.id },
    include: { _count: { select: { options: true, values: true } } },
  });
  if (!attribute) {
    return NextResponse.json(
      { message: "No se encontró el atributo." },
      { status: 404 },
    );
  }

  const policy = canDeleteAttribute(attribute._count);
  if (!policy.allowed) {
    return NextResponse.json({ message: policy.reason }, { status: 409 });
  }

  await prisma.attributeDefinition.delete({ where: { id: attribute.id } });
  return NextResponse.json({ id: attribute.id, name: attribute.name });
}
