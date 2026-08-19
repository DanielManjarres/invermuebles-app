import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCatalogProductInput,
  validateCatalogProductInput,
} from "../../lib/catalog-product-policy.ts";

test("normalizes the general product information", () => {
  assert.deepEqual(
    normalizeCatalogProductInput({
      brand: "  Kálley ",
      details: "  Televisor QLED  ",
      model: "  K-QLED   43 ",
      name: "  Televisor   inteligente ",
      primaryImageUrl: " https://example.com/tv.webp ",
    }),
    {
      brand: "Kálley",
      details: "Televisor QLED",
      model: "K-QLED 43",
      name: "Televisor inteligente",
      primaryImageUrl: "https://example.com/tv.webp",
    },
  );
});

test("validates required product information", () => {
  assert.match(
    validateCatalogProductInput({
      brand: "",
      details: "Descripción",
      model: "",
      name: "",
      primaryImageUrl: "",
    }),
    /nombre/i,
  );
  assert.match(
    validateCatalogProductInput({
      brand: "",
      details: "",
      model: "",
      name: "Sofá",
      primaryImageUrl: "",
    }),
    /descripción/i,
  );
});

test("accepts http images and rejects invalid image URLs", () => {
  const validInput = {
    brand: "Marca",
    details: "Descripción",
    model: "Modelo",
    name: "Producto",
    primaryImageUrl: "https://example.com/product.webp",
  };
  assert.equal(validateCatalogProductInput(validInput), "");
  assert.match(
    validateCatalogProductInput({ ...validInput, primaryImageUrl: "imagen" }),
    /URL válida/i,
  );
  assert.match(
    validateCatalogProductInput({
      ...validInput,
      primaryImageUrl: "file:///product.webp",
    }),
    /URL válida/i,
  );
});
