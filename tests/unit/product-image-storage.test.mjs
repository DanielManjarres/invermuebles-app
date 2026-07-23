import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductImageContentType,
  getProductImageExtension,
  maxProductImageSize,
} from "../../lib/product-image-storage.ts";

test("getProductImageExtension normalizes jpeg files", () => {
  assert.equal(getProductImageExtension("producto.jpeg", ""), ".jpg");
});

test("getProductImageExtension accepts image mime type when extension is missing", () => {
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
