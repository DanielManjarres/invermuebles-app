import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import test, { afterEach } from "node:test";
import {
  getProductImageContentType,
  getProductImageExtension,
  getProductImageUploadDir,
  maxProductImageSize,
  minimumProductImageLongSide,
  minimumProductImageShortSide,
  normalizedProductImageSize,
  normalizeProductImage,
  validateRemoteProductImageUrl,
} from "../../lib/product-image-storage.ts";

const originalUploadDir = process.env.UPLOAD_DIR;

afterEach(() => {
  if (originalUploadDir === undefined) {
    delete process.env.UPLOAD_DIR;
  } else {
    process.env.UPLOAD_DIR = originalUploadDir;
  }
});

test("getProductImageExtension normalizes jpeg files", () => {
  assert.equal(getProductImageExtension("producto.jpeg", ""), ".jpg");
});

test("getProductImageExtension accepts image mime type when extension is missing", () => {
  assert.equal(getProductImageExtension("producto", "image/jpeg"), ".jpg");
  assert.equal(getProductImageExtension("producto", "image/png"), ".png");
  assert.equal(getProductImageExtension("producto", "image/webp"), ".webp");
});

test("getProductImageExtension rejects unsupported files", () => {
  assert.equal(getProductImageExtension("producto.svg", "image/svg+xml"), "");
});

test("getProductImageContentType returns expected response content type", () => {
  assert.equal(getProductImageContentType("foto.jpg"), "image/jpeg");
  assert.equal(getProductImageContentType("foto.png"), "image/png");
  assert.equal(getProductImageContentType("foto.webp"), "image/webp");
  assert.equal(getProductImageContentType("foto.gif"), "");
});

test("maxProductImageSize keeps uploads at five megabytes", () => {
  assert.equal(maxProductImageSize, 5 * 1024 * 1024);
});

test("normalizes product images to a square webp canvas", async () => {
  const source = await sharp({
    create: {
      background: "#07552a",
      channels: 3,
      height: minimumProductImageShortSide,
      width: minimumProductImageLongSide,
    },
  })
    .jpeg()
    .toBuffer();

  const normalized = await normalizeProductImage(source);
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, normalizedProductImageSize);
  assert.equal(metadata.height, normalizedProductImageSize);
});

test("rejects product images below the minimum dimensions", async () => {
  const source = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: minimumProductImageShortSide - 1,
      width: minimumProductImageLongSide,
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    normalizeProductImage(source),
    /al menos 800 × 600 píxeles/,
  );
});

test("rejects files whose contents are not valid images", async () => {
  await assert.rejects(
    normalizeProductImage(Buffer.from("not-an-image")),
    /dañada o no se pudo procesar/,
  );
});

test("rejects non-HTTPS product image URLs", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl("http://images.example.com/product.jpg"),
    /URL publica HTTPS/,
  );
});

test("rejects local product image URLs", async () => {
  await assert.rejects(
    validateRemoteProductImageUrl("https://localhost/product.jpg"),
    /URL publica HTTPS/,
  );
});

test("resolves the default and configured product upload directories", () => {
  delete process.env.UPLOAD_DIR;
  assert.equal(
    getProductImageUploadDir(),
    path.resolve(process.cwd(), "public", "uploads", "products"),
  );

  process.env.UPLOAD_DIR = path.join("storage", "product-images");
  assert.equal(
    getProductImageUploadDir(),
    path.resolve("storage", "product-images"),
  );
});
