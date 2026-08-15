import assert from "node:assert/strict";
import path from "node:path";
import test, { afterEach } from "node:test";
import {
  getProductImageContentType,
  getProductImageExtension,
  getProductImageUploadDir,
  maxProductImageSize,
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
