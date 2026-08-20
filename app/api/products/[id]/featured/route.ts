import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { validateFeaturedProductChange } from "@/lib/featured-product-policy";
import { prisma } from "@/lib/prisma";

type FeaturedRequest = {
  featured?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json()) as FeaturedRequest;
  if (typeof body.featured !== "boolean") {
    return NextResponse.json(
      { message: "Indica si el producto debe aparecer en la página principal." },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.$transaction(
      async (transaction) => {
        const currentProduct = await transaction.product.findUnique({
          where: { id },
          select: { featured: true, visible: true },
        });
        if (!currentProduct) {
          return null;
        }

        const featuredCount = await transaction.product.count({
          where: { featured: true },
        });
        const validationError = validateFeaturedProductChange({
          alreadyFeatured: currentProduct.featured,
          featured: body.featured!,
          featuredCount,
          visible: currentProduct.visible,
        });
        if (validationError) {
          throw new FeaturedProductError(validationError);
        }

        const lastFeatured = body.featured
          ? await transaction.product.aggregate({
              _max: { featuredOrder: true },
              where: { featured: true },
            })
          : null;

        return transaction.product.update({
          where: { id },
          data: {
            featured: body.featured,
            featuredOrder: body.featured
              ? currentProduct.featured
                ? undefined
                : (lastFeatured?._max.featuredOrder ?? 0) + 1
              : null,
          },
          select: { featured: true, featuredOrder: true, id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!product) {
      return NextResponse.json(
        { message: "No se encontró el producto." },
        { status: 404 },
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof FeaturedProductError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    throw error;
  }
}

class FeaturedProductError extends Error {}
