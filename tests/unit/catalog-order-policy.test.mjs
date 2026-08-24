import assert from "node:assert/strict";
import test from "node:test";

import {
  getCatalogOrderItemError,
  normalizeCatalogOrderItems,
} from "../../lib/catalog-order-policy.ts";

test("normalizes and groups repeated catalog order items", () => {
  assert.deepEqual(
    normalizeCatalogOrderItems([
      { productId: " product-1 ", quantity: 2, variantId: " variant-1 " },
      { productId: "product-1", quantity: 3, variantId: "variant-1" },
      { productId: "", quantity: 1 },
      { productId: "product-2", quantity: 1.5 },
    ]),
    [{ productId: "product-1", quantity: 5, variantId: "variant-1" }],
  );
});

test("requires a valid variant when the product has active presentations", () => {
  const item = { productId: "product-1", quantity: 1, variantId: "" };
  const product = {
    hasActiveVariants: true,
    id: "product-1",
    name: "Televisor",
    stock: 4,
  };

  assert.equal(
    getCatalogOrderItemError(item, product),
    "Selecciona una presentación disponible de Televisor.",
  );
  assert.equal(
    getCatalogOrderItemError(
      { ...item, variantId: "variant-2" },
      product,
      {
        id: "variant-2",
        name: "55 pulgadas",
        productId: "product-2",
        stock: 2,
      },
    ),
    "La presentación seleccionada de Televisor ya no está disponible.",
  );
});

test("rejects quantities above variant stock and accepts available units", () => {
  const product = {
    hasActiveVariants: true,
    id: "product-1",
    name: "Televisor",
    stock: 4,
  };
  const variant = {
    id: "variant-1",
    name: "55 pulgadas",
    productId: "product-1",
    stock: 2,
  };

  assert.equal(
    getCatalogOrderItemError(
      { productId: "product-1", quantity: 3, variantId: "variant-1" },
      product,
      variant,
    ),
    "Solo hay 2 unidad(es) disponibles de Televisor · 55 pulgadas.",
  );
  assert.equal(
    getCatalogOrderItemError(
      { productId: "product-1", quantity: 2, variantId: "variant-1" },
      product,
      variant,
    ),
    null,
  );
});
