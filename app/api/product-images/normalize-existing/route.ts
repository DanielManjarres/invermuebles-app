import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  downloadProductImage,
  getProductImageUploadDir,
  normalizeProductImage,
} from "@/lib/product-image-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

async function readProductImage(imageUrl: string) {
  const storedFileName = getStoredImageFileName(imageUrl);
  if (storedFileName) {
    return readFile(path.join(getProductImageUploadDir(), storedFileName));
  }

  return downloadProductImage(imageUrl);
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
  const failedProducts: string[] = [];

  for (const product of products) {
    const selectedImage = product.images[0];
    const sourceUrl = selectedImage?.url ?? product.imageUrl;
    if (!sourceUrl) continue;

    try {
      const source = await readProductImage(sourceUrl);
      const normalizedImage = await normalizeProductImage(source);
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
    } catch {
      failedProducts.push(product.name);
    }
  }

  return NextResponse.json({
    failed: failedProducts.length,
    failedProducts,
    normalized,
  });
}
