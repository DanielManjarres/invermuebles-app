import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  downloadProductImage,
  getProductImageExtension,
  getProductImageUploadDir,
  maxProductImageSize,
  normalizeProductImage,
  ProductImageValidationError,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const contentType = request.headers.get("content-type") ?? "";
  let buffer: Buffer;

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { imageUrl?: string }
      | null;

    if (!body?.imageUrl?.trim()) {
      return NextResponse.json(
        { message: "Ingresa la URL de una imagen." },
        { status: 400 },
      );
    }

    try {
      buffer = await downloadProductImage(body.imageUrl.trim());
    } catch (error) {
      if (error instanceof ProductImageValidationError) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      throw error;
    }
  } else {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Selecciona una imagen para subir." },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { message: "La imagen esta vacia." },
        { status: 400 },
      );
    }

    if (file.size > maxProductImageSize) {
      return NextResponse.json(
        { message: "La imagen no puede pesar mas de 5 MB." },
        { status: 400 },
      );
    }

    const extension = getProductImageExtension(file.name, file.type);

    if (!extension) {
      return NextResponse.json(
        { message: "Solo se permiten imagenes JPG, PNG o WEBP." },
        { status: 400 },
      );
    }

    buffer = Buffer.from(await file.arrayBuffer());
  }

  const uploadDir = getProductImageUploadDir();
  const fileName = `${Date.now()}-${randomUUID()}.webp`;
  const filePath = path.join(uploadDir, fileName);
  let normalizedBuffer: Buffer;

  try {
    normalizedBuffer = await normalizeProductImage(buffer);
  } catch (error) {
    if (error instanceof ProductImageValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    throw error;
  }

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, normalizedBuffer);

  return NextResponse.json({
    imageUrl: `/api/product-images/${fileName}`,
  });
}
