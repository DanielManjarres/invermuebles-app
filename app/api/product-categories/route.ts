import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  canDeleteCategory,
  normalizeTaxonomyName,
  validateTaxonomyName,
} from "@/lib/product-taxonomy-policy";

type CategoryRequest = {
  active?: boolean;
  id?: string;
  name?: string;
};

async function findCategoryByName(name: string) {
  return prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { productTypes: true } },
      productTypes: {
        orderBy: { name: "asc" },
        select: { active: true, id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as CategoryRequest;
  const name = normalizeTaxonomyName(body.name);
  const validationError = validateTaxonomyName(name, "de la categoría");

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  if (await findCategoryByName(name)) {
    return NextResponse.json(
      { message: "Ya existe una categoría con ese nombre." },
      { status: 409 },
    );
  }

  try {
    const category = await prisma.category.create({
      data: { active: body.active ?? true, name },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe una categoría con ese nombre." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as CategoryRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica la categoría que quieres actualizar." },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({ where: { id: body.id } });
  if (!category) {
    return NextResponse.json(
      { message: "No se encontró la categoría." },
      { status: 404 },
    );
  }

  const name =
    body.name === undefined
      ? category.name
      : normalizeTaxonomyName(body.name);
  const validationError = validateTaxonomyName(name, "de la categoría");
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const duplicate = await findCategoryByName(name);
  if (duplicate && duplicate.id !== category.id) {
    return NextResponse.json(
      { message: "Ya existe una categoría con ese nombre." },
      { status: 409 },
    );
  }

  const active = body.active ?? category.active;
  const updatedCategory = await prisma.$transaction(async (transaction) => {
    if (!active && category.active) {
      await transaction.catalogProductType.updateMany({
        where: { categoryId: category.id, active: true },
        data: { active: false },
      });
    }

    return transaction.category.update({
      where: { id: category.id },
      data: { active, name },
    });
  });

  return NextResponse.json({ category: updatedCategory });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as CategoryRequest;
  if (!body.id) {
    return NextResponse.json(
      { message: "Indica la categoría que quieres eliminar." },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: body.id },
    include: { _count: { select: { productTypes: true } } },
  });
  if (!category) {
    return NextResponse.json(
      { message: "No se encontró la categoría." },
      { status: 404 },
    );
  }

  const policy = canDeleteCategory(category._count);
  if (!policy.allowed) {
    return NextResponse.json({ message: policy.reason }, { status: 409 });
  }

  await prisma.category.delete({ where: { id: category.id } });
  return NextResponse.json({ id: category.id, name: category.name });
}
