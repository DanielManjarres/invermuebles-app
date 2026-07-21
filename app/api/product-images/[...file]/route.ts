import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getProductImageContentType,
  getProductImageUploadDir,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

type ImageRouteContext = {
  params: Promise<{
    file: string[];
  }>;
};

export async function GET(_request: Request, context: ImageRouteContext) {
  const { file } = await context.params;
  const fileName = file.join("/");
  const uploadDir = getProductImageUploadDir();
  const filePath = path.resolve(uploadDir, fileName);

  if (!filePath.startsWith(uploadDir + path.sep)) {
    return NextResponse.json({ message: "Imagen no valida." }, { status: 400 });
  }

  const contentType = getProductImageContentType(filePath);

  if (!contentType) {
    return NextResponse.json({ message: "Imagen no valida." }, { status: 400 });
  }

  try {
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      return NextResponse.json({ message: "Imagen no encontrada." }, { status: 404 });
    }

    const image = await readFile(filePath);

    return new Response(image, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStats.size),
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ message: "Imagen no encontrada." }, { status: 404 });
  }
}
