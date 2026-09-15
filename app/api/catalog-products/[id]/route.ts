import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeCatalogProductInput,
  validateCatalogProductInput,
} from "@/lib/catalog-product-policy";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TAX_RATE, addTax } from "@/lib/tax-calculator";
import {
  normalizeProductAttributes,
  normalizeProductReference,
  validateProductInventoryInput,
  type ProductAttributeInput,
} from "@/lib/product-attribute-policy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CatalogProductUpdateRequest = {
  attributeValues?: ProductAttributeInput[];
  baseCost?: number;
  brand?: string;
  details?: string;
  location?: string;
  minimumStock?: number;
  model?: string;
  name?: string;
  primaryImageUrl?: string;
  reference?: string;
  salePrice?: number;
  visible?: boolean;
};

const productInclude = {
  catalogProductType: {
    include: { category: { select: { id: true, name: true } } },
  },
  images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] },
  attributeValues: {
    include: { attribute: true, option: true },
    orderBy: { attribute: { position: "asc" as const } },
  },
};

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) {
    return NextResponse.json(
      { message: "No se encontró el producto." },
      { status: 404 },
    );
  }

  return NextResponse.json({ product });
}

export async function PUT(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json()) as CatalogProductUpdateRequest;
  const currentProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      attributeValues: true,
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
  if (!currentProduct) {
    return NextResponse.json(
      { message: "No se encontró el producto." },
      { status: 404 },
    );
  }

  const productInput = normalizeCatalogProductInput({
    brand: body.brand === undefined ? currentProduct.brand ?? "" : body.brand,
    details:
      body.details === undefined ? currentProduct.details : body.details,
    model: body.model === undefined ? currentProduct.model ?? "" : body.model,
    name: body.name === undefined ? currentProduct.name : body.name,
    primaryImageUrl:
      body.primaryImageUrl === undefined
        ? currentProduct.imageUrl ?? ""
        : body.primaryImageUrl,
  });
  const validationError = validateCatalogProductInput(productInput);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const normalizedAttributes = normalizeProductAttributes(
    currentProduct.catalogProductType.attributes,
    body.attributeValues ??
      currentProduct.attributeValues.map((attributeValue) => ({
        attributeId: attributeValue.attributeId,
        optionId: attributeValue.optionId ?? undefined,
        value: attributeValue.value,
      })),
  );
  if (normalizedAttributes.error) {
    return NextResponse.json(
      { message: normalizedAttributes.error },
      { status: 400 },
    );
  }

  const reference = normalizeProductReference(body.reference ?? currentProduct.reference);
  const baseCost = Number(body.baseCost ?? currentProduct.baseCost);
  const salePrice = Number(body.salePrice ?? currentProduct.salePrice);
  const minimumStock = Number(body.minimumStock ?? currentProduct.minimumStock);
  const taxRate = DEFAULT_TAX_RATE;
  const cost = addTax(baseCost, taxRate).total;
  const inventoryError = validateProductInventoryInput({
    cost,
    minimumStock,
    name: productInput.name,
    reference,
    salePrice,
    stock: currentProduct.stock,
  });
  if (inventoryError) {
    return NextResponse.json(
      { message: inventoryError },
      { status: 400 },
    );
  }

  const changesPrimaryImage = body.primaryImageUrl !== undefined;
  try {
    const product = await prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id },
        data: {
          brand: productInput.brand || null,
          baseCost: String(baseCost),
          cost: String(cost),
          details: productInput.details,
          imageUrl: changesPrimaryImage
            ? productInput.primaryImageUrl || null
            : undefined,
          location:
            body.location === undefined
              ? currentProduct.location
              : body.location.trim() || null,
          minimumStock,
          model: productInput.model || null,
          name: productInput.name,
          reference,
          salePrice: String(salePrice),
          taxRate: String(taxRate),
          featured: body.visible === false ? false : undefined,
          featuredOrder: body.visible === false ? null : undefined,
          visible: body.visible,
        },
      });

      await transaction.productAttributeValue.deleteMany({ where: { productId: id } });
      if (normalizedAttributes.values.length) {
        await transaction.productAttributeValue.createMany({
          data: normalizedAttributes.values.map((value) => ({
            ...value,
            productId: id,
          })),
        });
      }

      if (changesPrimaryImage) {
        await transaction.productImage.deleteMany({
          where: { productId: id, isPrimary: true },
        });
        if (productInput.primaryImageUrl) {
          await transaction.productImage.create({
            data: {
              alt: productInput.name,
              isPrimary: true,
              productId: id,
              url: productInput.primaryImageUrl,
            },
          });
        }
      } else {
        await transaction.productImage.updateMany({
          where: { productId: id, isPrimary: true },
          data: { alt: productInput.name },
        });
      }

      return transaction.product.findUnique({
        where: { id },
        include: productInclude,
      });
    });

    return NextResponse.json({ product });
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
