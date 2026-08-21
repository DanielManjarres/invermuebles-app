import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  canDeleteProductVariant,
  buildVariantName,
  normalizeVariantAttributes,
  normalizeVariantReference,
  validateVariantInput,
  type VariantAttributeInput,
} from "@/lib/product-variant-policy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VariantUpdateRequest = {
  active?: boolean;
  attributeValues?: VariantAttributeInput[];
  cost?: number;
  location?: string;
  minimumStock?: number;
  name?: string;
  reference?: string;
  salePrice?: number;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json()) as VariantUpdateRequest;
  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      attributeValues: {
        select: { attributeId: true, optionId: true, value: true },
      },
      product: {
        include: {
          catalogProductType: {
            include: {
              attributes: {
                include: { options: true },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!variant) {
    return NextResponse.json(
      { message: "No se encontró la variante." },
      { status: 404 },
    );
  }
  if (!variant.product.catalogProductType) {
    return NextResponse.json(
      { message: "El producto no tiene asignado el nuevo tipo de producto." },
      { status: 409 },
    );
  }

  const reference =
    body.reference === undefined
      ? variant.reference
      : normalizeVariantReference(body.reference);
  const cost = body.cost === undefined ? Number(variant.cost) : Number(body.cost);
  const salePrice =
    body.salePrice === undefined
      ? Number(variant.salePrice)
      : Number(body.salePrice);
  const minimumStock =
    body.minimumStock === undefined
      ? variant.minimumStock
      : Number(body.minimumStock);
  const active = body.active ?? variant.active;
  const referenceOwner = await prisma.productVariant.findUnique({
    where: { reference },
  });
  if (referenceOwner && referenceOwner.id !== variant.id) {
    return NextResponse.json(
      { message: "Ya existe una variante con esa referencia." },
      { status: 409 },
    );
  }

  const normalizedAttributes = body.attributeValues
    ? normalizeVariantAttributes(
        variant.product.catalogProductType.attributes,
        body.attributeValues,
      )
    : { error: "", values: variant.attributeValues };
  if (normalizedAttributes.error) {
    return NextResponse.json(
      { message: normalizedAttributes.error },
      { status: 400 },
    );
  }

  const name = buildVariantName(
    variant.product.catalogProductType.attributes,
    normalizedAttributes.values,
    reference,
  );
  const validationError = validateVariantInput({
    cost,
    minimumStock,
    name,
    reference,
    salePrice,
    stock: variant.stock,
  });
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const nameOwner = await prisma.productVariant.findFirst({
    where: {
      id: { not: variant.id },
      name: { equals: name, mode: "insensitive" },
      productId: variant.productId,
    },
  });
  if (nameOwner) {
    return NextResponse.json(
      { message: "Ya existe una variante con ese nombre en el producto." },
      { status: 409 },
    );
  }

  try {
    const updatedVariant = await prisma.$transaction(async (transaction) => {
      if (body.attributeValues) {
        await transaction.variantAttributeValue.deleteMany({
          where: { variantId: variant.id },
        });
      }

      const savedVariant = await transaction.productVariant.update({
        where: { id: variant.id },
        data: {
          active,
          attributeValues: body.attributeValues
            ? {
                create: normalizedAttributes.values,
              }
            : undefined,
          cost: String(cost),
          location:
            body.location === undefined
              ? variant.location
              : cleanText(body.location) || null,
          minimumStock,
          name,
          reference,
          salePrice: String(salePrice),
        },
      });

      return savedVariant;
    });

    return NextResponse.json({ variant: updatedVariant });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "La referencia o el nombre de la variante ya está registrado." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          variants: {
            orderBy: { createdAt: "asc" },
            select: { id: true },
          },
        },
      },
      stockMovements: {
        select: { id: true, note: true, reason: true, type: true },
      },
      _count: { select: { orderItems: true, saleItems: true } },
    },
  });
  if (!variant) {
    return NextResponse.json(
      { message: "No se encontró la variante." },
      { status: 404 },
    );
  }

  const policy = canDeleteProductVariant({
    orderItemsCount: variant._count.orderItems,
    saleItemsCount: variant._count.saleItems,
    stockMovements: variant.stockMovements,
    variantCount: variant.product.variants.length,
  });
  if (!policy.allowed) {
    return NextResponse.json({ message: policy.reason }, { status: 409 });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.stockMovement.deleteMany({ where: { variantId: variant.id } });
    await transaction.productVariant.delete({ where: { id: variant.id } });
    if (variant.stock > 0) {
      await transaction.product.update({
        where: { id: variant.productId },
        data: {
          stock: { decrement: variant.stock },
        },
      });
    }
  });

  return NextResponse.json({
    deletedInitialMovements: variant.stockMovements.length,
    id: variant.id,
    name: variant.name,
  });
}
