import { Prisma, StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TAX_RATE, addTax } from "@/lib/tax-calculator";
import {
  INITIAL_STOCK_REASON,
  PRODUCT_VARIANT_INITIAL_NOTE,
  buildVariantName,
  normalizeVariantAttributes,
  normalizeVariantReference,
  validateVariantInput,
  type VariantAttributeInput,
} from "@/lib/product-variant-policy";

type VariantRequest = {
  active?: boolean;
  attributeValues?: VariantAttributeInput[];
  baseCost?: number;
  cost?: number;
  location?: string;
  minimumStock?: number;
  name?: string;
  productId?: string;
  reference?: string;
  salePrice?: number;
  stock?: number;
};

function cleanText(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

async function getAdminUserId() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@invermuebles.com" },
    update: { active: true, name: "Administrador", role: UserRole.ADMIN },
    create: {
      active: true,
      email: "admin@invermuebles.com",
      name: "Administrador",
      role: UserRole.ADMIN,
    },
  });
  return admin.id;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json(
      { message: "Indica el producto que quieres consultar." },
      { status: 400 },
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: {
      attributeValues: {
        include: {
          attribute: {
            select: { dataType: true, key: true, name: true, unit: true },
          },
          option: { select: { id: true, value: true } },
        },
        orderBy: { attribute: { position: "asc" } },
      },
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ variants });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as VariantRequest;
  if (!body.productId) {
    return NextResponse.json(
      { message: "Selecciona el producto de la variante." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
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
  });
  if (!product) {
    return NextResponse.json(
      { message: "No se encontró el producto." },
      { status: 404 },
    );
  }
  if (!product.catalogProductType) {
    return NextResponse.json(
      { message: "Asigna primero la nueva categoría y tipo al producto." },
      { status: 409 },
    );
  }

  const normalizedAttributes = normalizeVariantAttributes(
    product.catalogProductType.attributes,
    body.attributeValues ?? [],
  );
  if (normalizedAttributes.error) {
    return NextResponse.json(
      { message: normalizedAttributes.error },
      { status: 400 },
    );
  }

  const reference = normalizeVariantReference(body.reference);
  const baseCost = Number(body.baseCost);
  const taxRate = DEFAULT_TAX_RATE;
  const cost = addTax(baseCost, taxRate).total;
  const name = buildVariantName(
    product.catalogProductType.attributes,
    normalizedAttributes.values,
    reference,
  );
  const validationError = validateVariantInput({ ...body, cost, name, reference });
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }
  if (await prisma.productVariant.findUnique({ where: { reference } })) {
    return NextResponse.json(
      { message: "Ya existe una variante con esa referencia." },
      { status: 409 },
    );
  }

  const duplicateName = await prisma.productVariant.findUnique({
    where: { productId_name: { name, productId: product.id } },
  });
  if (duplicateName) {
    return NextResponse.json(
      { message: "Ya existe una variante con ese nombre en el producto." },
      { status: 409 },
    );
  }

  const stock = Number(body.stock);
  const adminUserId = stock > 0 ? await getAdminUserId() : null;

  try {
    const variant = await prisma.$transaction(async (transaction) => {
      const createdVariant = await transaction.productVariant.create({
        data: {
          active: body.active ?? true,
          attributeValues: {
            create: normalizedAttributes.values,
          },
          baseCost: String(baseCost),
          cost: String(cost),
          location: cleanText(body.location) || null,
          minimumStock: Number(body.minimumStock),
          name,
          productId: product.id,
          reference,
          salePrice: String(Number(body.salePrice)),
          stock,
          taxRate: String(taxRate),
        },
      });

      if (stock > 0) {
        await transaction.product.update({
          where: { id: product.id },
          data: {
            stock: { increment: stock },
          },
        });
      }

      if (stock > 0) {
        await transaction.stockMovement.create({
          data: {
            nextStock: stock,
            note: PRODUCT_VARIANT_INITIAL_NOTE,
            previousStock: 0,
            productId: product.id,
            quantity: stock,
            reason: INITIAL_STOCK_REASON,
            type: StockMovementType.ENTRY,
            userId: adminUserId,
            variantId: createdVariant.id,
          },
        });
      }

      return createdVariant;
    });

    return NextResponse.json({ variant }, { status: 201 });
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
