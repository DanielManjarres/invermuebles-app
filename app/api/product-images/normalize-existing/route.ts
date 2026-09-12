import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  downloadProductImage,
  getProductImageUploadDir,
  normalizeProductImage,
  ProductImageValidationError,
} from "@/lib/product-image-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ImageNormalizationFailure = {
  productName: string;
  reason: string;
};

function getStoredImageFileName(imageUrl: string) {
  const prefix = "/api/product-images/";
  if (!imageUrl.startsWith(prefix)) return null;

  try {
    const fileName = decodeURIComponent(imageUrl.slice(prefix.length));
    return fileName && path.basename(fileName) === fileName ? fileName : null;
  } catch {
    return null;
  }
}

async function readProductImage(imageUrl: string, uploadDir: string) {
  const storedFileName = getStoredImageFileName(imageUrl);
  if (storedFileName) {
    return readFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ uploadDir,
        storedFileName,
      ),
    );
  }

  return downloadProductImage(imageUrl);
}

function getFailureReason(error: unknown) {
  if (error instanceof ProductImageValidationError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return "No se encontró el archivo original de la imagen.";
  }

  return "No fue posible leer o procesar la imagen.";
}

export async function POST() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const products = await prisma.product.findMany({
    where: {
      OR: [{ imageUrl: { not: null } }, { images: { some: {} } }],
    },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
    },
    orderBy: { name: "asc" },
  });
  const uploadDir = getProductImageUploadDir();
  await mkdir(uploadDir, { recursive: true });

  let normalized = 0;
  const failures: ImageNormalizationFailure[] = [];

  for (const product of products) {
    const selectedImage = product.images[0];
    const sourceUrl = selectedImage?.url ?? product.imageUrl;
    if (!sourceUrl) continue;

    try {
      const source = await readProductImage(sourceUrl, uploadDir);
      const normalizedImage = await normalizeProductImage(source, {
        enforceMinimumDimensions: false,
      });
      const fileName = `${Date.now()}-${randomUUID()}.webp`;
      const imageUrl = `/api/product-images/${fileName}`;

      await writeFile(path.join(uploadDir, fileName), normalizedImage);
      await prisma.$transaction([
        prisma.product.update({
          data: { imageUrl },
          where: { id: product.id },
        }),
        ...(selectedImage
          ? [
              prisma.productImage.update({
                data: { url: imageUrl },
                where: { id: selectedImage.id },
              }),
            ]
          : [
              prisma.productImage.create({
                data: {
                  alt: product.name,
                  isPrimary: true,
                  productId: product.id,
                  url: imageUrl,
                },
              }),
            ]),
      ]);
      normalized += 1;
    } catch (error) {
      failures.push({
        productName: product.name,
        reason: getFailureReason(error),
      });
    }
  }

  return NextResponse.json({
    failed: failures.length,
    failedProducts: failures.map(({ productName }) => productName),
    failures,
    normalized,
  });
}
