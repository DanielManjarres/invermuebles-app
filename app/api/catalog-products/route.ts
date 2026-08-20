import { Prisma, StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeCatalogProductInput,
  validateCatalogProductInput,
} from "@/lib/catalog-product-policy";
import { prisma } from "@/lib/prisma";
import {
  CATALOG_PRODUCT_INITIAL_NOTE,
  buildVariantName,
  INITIAL_STOCK_REASON,
  normalizeVariantAttributes,
  normalizeVariantReference,
  validateVariantInput,
  type VariantAttributeInput,
} from "@/lib/product-variant-policy";

type CatalogProductRequest = {
  brand?: string;
  catalogProductTypeId?: string;
  defaultVariant?: {
    attributeValues?: VariantAttributeInput[];
    cost?: number;
    location?: string;
    minimumStock?: number;
    name?: string;
    reference?: string;
    salePrice?: number;
    stock?: number;
  };
  details?: string;
  model?: string;
  name?: string;
  primaryImageUrl?: string;
  visible?: boolean;
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

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const products = await prisma.product.findMany({
    include: {
      catalogProductType: {
        include: { category: { select: { id: true, name: true } } },
      },
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      variants: {
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
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as CatalogProductRequest;
  const productInput = normalizeCatalogProductInput(body);
  const productError = validateCatalogProductInput(productInput);
  if (productError) {
    return NextResponse.json({ message: productError }, { status: 400 });
  }
  if (!body.catalogProductTypeId) {
    return NextResponse.json(
      { message: "Selecciona el tipo de producto." },
      { status: 400 },
    );
  }
  if (!body.defaultVariant) {
    return NextResponse.json(
      { message: "Registra la variante predeterminada del producto." },
      { status: 400 },
    );
  }

  const catalogProductType = await prisma.catalogProductType.findUnique({
    where: { id: body.catalogProductTypeId },
    include: {
      attributes: {
        include: { options: true },
        orderBy: { position: "asc" },
      },
      category: true,
    },
  });
  if (!catalogProductType) {
    return NextResponse.json(
      { message: "No se encontró el tipo de producto." },
      { status: 404 },
    );
  }
  if (!catalogProductType.active || !catalogProductType.category.active) {
    return NextResponse.json(
      { message: "La categoría y el tipo de producto deben estar activos." },
      { status: 409 },
    );
  }

  const normalizedAttributes = normalizeVariantAttributes(
    catalogProductType.attributes,
    body.defaultVariant.attributeValues ?? [],
  );
  if (normalizedAttributes.error) {
    return NextResponse.json(
      { message: normalizedAttributes.error },
      { status: 400 },
    );
  }

  const reference = normalizeVariantReference(body.defaultVariant.reference);
  const variantName = buildVariantName(
    catalogProductType.attributes,
    normalizedAttributes.values,
    reference,
  );
  const variantError = validateVariantInput({
    ...body.defaultVariant,
    name: variantName,
    reference,
  });
  if (variantError) {
    return NextResponse.json({ message: variantError }, { status: 400 });
  }
  const stock = Number(body.defaultVariant.stock);
  const adminUserId = stock > 0 ? await getAdminUserId() : null;

  try {
    const product = await prisma.$transaction(async (transaction) => {
      const legacyType = await transaction.productType.upsert({
        where: { name: catalogProductType.category.name },
        update: {},
        create: { name: catalogProductType.category.name },
      });
      const legacyClass = await transaction.productClass.upsert({
        where: {
          name_productTypeId: {
            name: catalogProductType.name,
            productTypeId: legacyType.id,
          },
        },
        update: {},
        create: {
          name: catalogProductType.name,
          productTypeId: legacyType.id,
        },
      });

      const createdProduct = await transaction.product.create({
        data: {
          brand: productInput.brand || null,
          catalogProductTypeId: catalogProductType.id,
          cost: String(Number(body.defaultVariant?.cost)),
          details: productInput.details,
          imageUrl: productInput.primaryImageUrl || null,
          model: productInput.model || null,
          name: productInput.name,
          productClassId: legacyClass.id,
          productTypeId: legacyType.id,
          reference,
          salePrice: String(Number(body.defaultVariant?.salePrice)),
          stock,
          visible: body.visible ?? false,
        },
      });

      const variant = await transaction.productVariant.create({
        data: {
          active: true,
          attributeValues: { create: normalizedAttributes.values },
          cost: String(Number(body.defaultVariant?.cost)),
          isDefault: true,
          location: cleanText(body.defaultVariant?.location) || null,
          minimumStock: Number(body.defaultVariant?.minimumStock),
          name: variantName,
          productId: createdProduct.id,
          reference,
          salePrice: String(Number(body.defaultVariant?.salePrice)),
          stock,
        },
      });

      if (productInput.primaryImageUrl) {
        await transaction.productImage.create({
          data: {
            alt: productInput.name,
            isPrimary: true,
            productId: createdProduct.id,
            url: productInput.primaryImageUrl,
          },
        });
      }

      if (stock > 0) {
        await transaction.stockMovement.create({
          data: {
            nextStock: stock,
            note: CATALOG_PRODUCT_INITIAL_NOTE,
            previousStock: 0,
            productId: createdProduct.id,
            quantity: stock,
            reason: INITIAL_STOCK_REASON,
            type: StockMovementType.ENTRY,
            userId: adminUserId,
            variantId: variant.id,
          },
        });
      }

      return transaction.product.findUnique({
        where: { id: createdProduct.id },
        include: { images: true, variants: true },
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "La referencia de la variante ya está registrada." },
        { status: 409 },
      );
    }
    throw error;
  }
}
