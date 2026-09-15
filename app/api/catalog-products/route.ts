import { Prisma, StockMovementType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeCatalogProductInput,
  validateCatalogProductInput,
} from "@/lib/catalog-product-policy";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TAX_RATE, addTax } from "@/lib/tax-calculator";
import {
  INITIAL_STOCK_REASON,
  normalizeProductAttributes,
  normalizeProductReference,
  validateProductInventoryInput,
  type ProductAttributeInput,
} from "@/lib/product-attribute-policy";

type CatalogProductRequest = {
  attributeValues?: ProductAttributeInput[];
  baseCost?: number;
  brand?: string;
  catalogProductTypeId?: string;
  details?: string;
  location?: string;
  minimumStock?: number;
  model?: string;
  name?: string;
  primaryImageUrl?: string;
  reference?: string;
  salePrice?: number;
  stock?: number;
  visible?: boolean;
};

const PRODUCT_INITIAL_NOTE = "Producto creado desde gestión de productos";

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
      attributeValues: {
        include: { attribute: true, option: true },
        orderBy: { attribute: { position: "asc" } },
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

  const normalizedAttributes = normalizeProductAttributes(
    catalogProductType.attributes,
    body.attributeValues ?? [],
  );
  if (normalizedAttributes.error) {
    return NextResponse.json(
      { message: normalizedAttributes.error },
      { status: 400 },
    );
  }

  const reference = normalizeProductReference(body.reference);
  const baseCost = Number(body.baseCost);
  const taxRate = DEFAULT_TAX_RATE;
  const cost = addTax(baseCost, taxRate).total;
  const inventoryError = validateProductInventoryInput({
    minimumStock: body.minimumStock,
    name: productInput.name,
    salePrice: body.salePrice,
    stock: body.stock,
    cost,
    reference,
  });
  if (inventoryError) {
    return NextResponse.json(
      { message: inventoryError },
      { status: 400 },
    );
  }
  const stock = Number(body.stock);
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
          baseCost: String(baseCost),
          catalogProductTypeId: catalogProductType.id,
          cost: String(cost),
          details: productInput.details,
          imageUrl: productInput.primaryImageUrl || null,
          location: cleanText(body.location) || null,
          minimumStock: Number(body.minimumStock),
          model: productInput.model || null,
          name: productInput.name,
          productClassId: legacyClass.id,
          productTypeId: legacyType.id,
          reference,
          salePrice: String(Number(body.salePrice)),
          stock,
          taxRate: String(taxRate),
          visible: body.visible ?? false,
        },
      });

      if (normalizedAttributes.values.length) {
        await transaction.productAttributeValue.createMany({
          data: normalizedAttributes.values.map((value) => ({
            ...value,
            productId: createdProduct.id,
          })),
        });
      }

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
            note: PRODUCT_INITIAL_NOTE,
            previousStock: 0,
            productId: createdProduct.id,
            quantity: stock,
            reason: INITIAL_STOCK_REASON,
            type: StockMovementType.ENTRY,
            userId: adminUserId,
          },
        });
      }

      return transaction.product.findUnique({
        where: { id: createdProduct.id },
        include: { attributeValues: true, images: true },
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "La referencia del producto ya está registrada." },
        { status: 409 },
      );
    }
    throw error;
  }
}
