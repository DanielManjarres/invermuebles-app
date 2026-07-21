import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getProductImageExtension,
  getProductImageUploadDir,
  maxProductImageSize,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecciona una imagen para subir." },
      { status: 400 }
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { message: "La imagen esta vacia." },
      { status: 400 }
    );
  }

  if (file.size > maxProductImageSize) {
    return NextResponse.json(
      { message: "La imagen no puede pesar mas de 5 MB." },
      { status: 400 }
    );
  }

  const extension = getProductImageExtension(file.name, file.type);

  if (!extension) {
    return NextResponse.json(
      { message: "Solo se permiten imagenes JPG, PNG o WEBP." },
      { status: 400 }
    );
  }

  const uploadDir = getProductImageUploadDir();
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);

  return NextResponse.json({
    imageUrl: `/api/product-images/${fileName}`,
  });
}
