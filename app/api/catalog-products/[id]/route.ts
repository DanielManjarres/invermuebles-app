import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeCatalogProductInput,
  validateCatalogProductInput,
} from "@/lib/catalog-product-policy";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CatalogProductUpdateRequest = {
  brand?: string;
  details?: string;
  model?: string;
  name?: string;
  primaryImageUrl?: string;
  visible?: boolean;
};

const productInclude = {
  catalogProductType: {
    include: { category: { select: { id: true, name: true } } },
  },
  images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] },
  variants: {
    include: {
      attributeValues: {
        include: {
          attribute: {
            select: { dataType: true, key: true, name: true, unit: true },
          },
          option: { select: { id: true, value: true } },
        },
        orderBy: { attribute: { position: "asc" as const } },
      },
      images: { orderBy: { position: "asc" as const } },
    },
    orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }],
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
  const currentProduct = await prisma.product.findUnique({ where: { id } });
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

  const changesPrimaryImage = body.primaryImageUrl !== undefined;
  const product = await prisma.$transaction(async (transaction) => {
    await transaction.product.update({
      where: { id },
      data: {
        brand: productInput.brand || null,
        details: productInput.details,
        imageUrl: changesPrimaryImage
          ? productInput.primaryImageUrl || null
          : undefined,
        model: productInput.model || null,
        name: productInput.name,
        visible: body.visible,
      },
    });

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
}
