import assert from "node:assert/strict";
import test from "node:test";

import {
  getCatalogOrderItemError,
  normalizeCatalogOrderItems,
} from "../../lib/catalog-order-policy.ts";

test("normalizes and groups repeated catalog order items", () => {
  assert.deepEqual(
    normalizeCatalogOrderItems([
      { productId: " product-1 ", quantity: 2 },
      { productId: "product-1", quantity: 3 },
      { productId: "", quantity: 1 },
      { productId: "product-2", quantity: 1.5 },
    ]),
    [{ productId: "product-1", quantity: 5 }],
  );
});

test("rejects quantities above product stock and accepts available units", () => {
  const product = { name: "Televisor", stock: 2 };
  assert.equal(
    getCatalogOrderItemError({ productId: "product-1", quantity: 3 }, product),
    "Solo hay 2 unidad(es) disponibles de Televisor.",
  );
  assert.equal(
    getCatalogOrderItemError({ productId: "product-1", quantity: 2 }, product),
    null,
  );
});
