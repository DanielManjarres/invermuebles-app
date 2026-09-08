import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import path from "node:path";
import sharp from "sharp";

const defaultUploadDir = path.join(process.cwd(), "public", "uploads", "products");

export const maxProductImageSize = 5 * 1024 * 1024;
export const minimumProductImageLongSide = 800;
export const minimumProductImageShortSide = 600;
export const normalizedProductImageSize = 1200;

const supportedProductImageFormats = new Set(["jpeg", "png", "webp"]);
const supportedProductImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class ProductImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageValidationError";
  }
}

export async function normalizeProductImage(input: Buffer) {
  try {
    const metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).metadata();
    const rotatesDimensions =
      metadata.orientation !== undefined &&
      metadata.orientation >= 5 &&
      metadata.orientation <= 8;
    const width = rotatesDimensions ? metadata.height : metadata.width;
    const height = rotatesDimensions ? metadata.width : metadata.height;

    if (!metadata.format || !supportedProductImageFormats.has(metadata.format)) {
      throw new ProductImageValidationError(
        "El contenido debe ser una imagen JPG, PNG o WEBP válida.",
      );
    }

    if (!width || !height) {
      throw new ProductImageValidationError(
        "No fue posible determinar las dimensiones de la imagen.",
      );
    }

    if (
      Math.max(width, height) < minimumProductImageLongSide ||
      Math.min(width, height) < minimumProductImageShortSide
    ) {
      throw new ProductImageValidationError(
        "La imagen debe medir al menos 800 × 600 píxeles.",
      );
    }

    return await sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(normalizedProductImageSize, normalizedProductImageSize, {
        background: "#ffffff",
        fit: "contain",
      })
      .flatten({ background: "#ffffff" })
      .webp({ effort: 4, quality: 82 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ProductImageValidationError) {
      throw error;
    }

    throw new ProductImageValidationError(
      "La imagen está dañada o no se pudo procesar.",
    );
  }
}

function isPrivateIpAddress(address: string) {
  if (isIP(address) === 4) {
    const [first, second] = address.split(".").map(Number);

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }

  if (isIP(address) === 6) {
    const normalizedAddress = address.toLowerCase();
    return (
      normalizedAddress === "::" ||
      normalizedAddress === "::1" ||
      normalizedAddress.startsWith("fc") ||
      normalizedAddress.startsWith("fd") ||
      /^fe[89ab]/.test(normalizedAddress) ||
      normalizedAddress.startsWith("::ffff:127.") ||
      normalizedAddress.startsWith("::ffff:10.") ||
      normalizedAddress.startsWith("::ffff:192.168.")
    );
  }

  return true;
}

type ProductImageHostLookup = typeof lookup;
type ProductImageFetch = typeof fetch;

export async function validateRemoteProductImageUrl(
  value: string,
  lookupHost: ProductImageHostLookup = lookup,
) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ProductImageValidationError("Ingresa una URL de imagen valida.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ProductImageValidationError(
      "La imagen debe usar una URL publica HTTPS.",
    );
  }

  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new ProductImageValidationError(
      "La imagen debe usar una URL publica HTTPS.",
    );
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookupHost(url.hostname, { all: true });
  } catch {
    throw new ProductImageValidationError(
      "No fue posible encontrar el servidor de la imagen.",
    );
  }

  if (!addresses.length || addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new ProductImageValidationError(
      "La imagen debe usar una URL publica HTTPS.",
    );
  }

  return url;
}

async function readResponseWithinLimit(response: Response) {
  if (!response.body) {
    throw new ProductImageValidationError("La URL no devolvio una imagen.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxProductImageSize) {
      await reader.cancel();
      throw new ProductImageValidationError(
        "La imagen no puede pesar mas de 5 MB.",
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, size);
}

export async function downloadProductImage(
  remoteUrl: string,
  dependencies: {
    fetchRemote?: ProductImageFetch;
    lookupHost?: ProductImageHostLookup;
  } = {},
) {
  const fetchRemote = dependencies.fetchRemote ?? fetch;
  const lookupHost = dependencies.lookupHost ?? lookup;
  let currentUrl = await validateRemoteProductImageUrl(remoteUrl, lookupHost);

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    let response: Response;
    try {
      response = await fetchRemote(currentUrl, {
        headers: { "User-Agent": "Invermuebles product image importer" },
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ProductImageValidationError(
        "No fue posible descargar la imagen desde la URL.",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) {
        throw new ProductImageValidationError(
          "La URL de la imagen tiene demasiadas redirecciones.",
        );
      }
      currentUrl = await validateRemoteProductImageUrl(
        new URL(location, currentUrl).toString(),
        lookupHost,
      );
      continue;
    }

    if (!response.ok) {
      throw new ProductImageValidationError(
        "No fue posible descargar la imagen desde la URL.",
      );
    }

    const contentType = response.headers.get("content-type")?.split(";")[0].trim();
    if (!contentType || !supportedProductImageMimeTypes.has(contentType)) {
      throw new ProductImageValidationError(
        "La URL debe apuntar directamente a una imagen JPG, PNG o WEBP.",
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxProductImageSize) {
      throw new ProductImageValidationError(
        "La imagen no puede pesar mas de 5 MB.",
      );
    }

    return readResponseWithinLimit(response);
  }

  throw new ProductImageValidationError("No fue posible descargar la imagen.");
}

export function getProductImageUploadDir() {
  return path.resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? defaultUploadDir
  );
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
