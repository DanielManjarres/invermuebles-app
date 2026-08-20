import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  canDeleteCatalogProductType,
  normalizeTaxonomyName,
  validateTaxonomyName,
} from "@/lib/product-taxonomy-policy";

type ProductTypeRequest = {
  active?: boolean;
  categoryId?: string;
  id?: string;
  name?: string;
};

async function findTypeByName(categoryId: string, name: string) {
  return prisma.catalogProductType.findFirst({
    where: {
      categoryId,
      name: { equals: name, mode: "insensitive" },
    },
  });
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const categoryId = new URL(request.url).searchParams.get("categoryId");
  const productTypes = await prisma.catalogProductType.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: {
      category: { select: { active: true, id: true, name: true } },
      _count: { select: { attributes: true, products: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ productTypes });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as ProductTypeRequest;
  const name = normalizeTaxonomyName(body.name);
  const validationError = validateTaxonomyName(name, "del tipo de producto");
  if (validationError || !body.categoryId) {
    return NextResponse.json(
      {
        message:
          validationError || "Selecciona la categoría del tipo de producto.",
      },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: body.categoryId },
  });
  if (!category) {
    return NextResponse.json(
      { message: "No se encontró la categoría seleccionada." },
      { status: 404 },
    );
  }
  if (!category.active && (body.active ?? true)) {
    return NextResponse.json(
      { message: "Activa la categoría antes de agregar tipos activos." },
      { status: 409 },
    );
  }

  if (await findTypeByName(category.id, name)) {
    return NextResponse.json(
      { message: "Ya existe ese tipo de producto en la categoría." },
      { status: 409 },
    );
  }

  try {
    const productType = await prisma.catalogProductType.create({
      data: {
        active: body.active ?? true,
        categoryId: category.id,
        name,
      },
    });
    return NextResponse.json({ productType }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe ese tipo de producto en la categoría." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as ProductTypeRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica el tipo de producto que quieres actualizar." },
      { status: 400 },
    );
  }

  const productType = await prisma.catalogProductType.findUnique({
    where: { id: body.id },
    include: { category: true },
  });
  if (!productType) {
    return NextResponse.json(
      { message: "No se encontró el tipo de producto." },
      { status: 404 },
    );
  }

  const name =
    body.name === undefined
      ? productType.name
      : normalizeTaxonomyName(body.name);
  const validationError = validateTaxonomyName(name, "del tipo de producto");
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const active = body.active ?? productType.active;
  if (active && !productType.category.active) {
    return NextResponse.json(
      { message: "Activa la categoría antes de activar este tipo." },
      { status: 409 },
    );
  }

  const duplicate = await findTypeByName(productType.categoryId, name);
  if (duplicate && duplicate.id !== productType.id) {
    return NextResponse.json(
      { message: "Ya existe ese tipo de producto en la categoría." },
      { status: 409 },
    );
  }

  const updatedProductType = await prisma.catalogProductType.update({
    where: { id: productType.id },
    data: { active, name },
  });
  return NextResponse.json({ productType: updatedProductType });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as ProductTypeRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica el tipo de producto que quieres eliminar." },
      { status: 400 },
    );
  }

  const productType = await prisma.catalogProductType.findUnique({
    where: { id: body.id },
    include: { _count: { select: { attributes: true, products: true } } },
  });
  if (!productType) {
    return NextResponse.json(
      { message: "No se encontró el tipo de producto." },
      { status: 404 },
    );
  }

  const policy = canDeleteCatalogProductType(productType._count);
  if (!policy.allowed) {
    return NextResponse.json({ message: policy.reason }, { status: 409 });
  }

  await prisma.catalogProductType.delete({ where: { id: productType.id } });
  return NextResponse.json({ id: productType.id, name: productType.name });
}
