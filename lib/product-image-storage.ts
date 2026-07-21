import path from "node:path";

const defaultUploadDir = path.join(process.cwd(), "public", "uploads", "products");

export const maxProductImageSize = 5 * 1024 * 1024;

export function getProductImageUploadDir() {
  return path.resolve(process.env.UPLOAD_DIR ?? defaultUploadDir);
}

export function getProductImageContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "";
}

export function getProductImageExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return "";
}
