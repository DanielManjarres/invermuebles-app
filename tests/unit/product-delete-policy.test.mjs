import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteProduct } from "../../lib/product-delete-policy.ts";

test("allows deleting products without orders and only initial inventory movements", () => {
  const result = canDeleteProduct({
    orderItemsCount: 0,
    stockMovements: [
      {
        note: "Carga inicial de productos",
        reason: "Inventario inicial",
        type: "ADJUSTMENT",
      },
    ],
  });

  assert.equal(result.allowed, true);
});

test("allows the initial entry created with a product variant", () => {
  const result = canDeleteProduct({
    orderItemsCount: 0,
    saleItemsCount: 0,
    stockMovements: [
      {
        note: "Variante creada junto con el producto",
        reason: "Inventario inicial",
        type: "ENTRY",
      },
    ],
  });

  assert.equal(result.allowed, true);
});

test("blocks deleting products with registered orders", () => {
  const result = canDeleteProduct({
    orderItemsCount: 1,
    stockMovements: [],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /pedidos registrados/i);
});

test("blocks deleting products with registered sales", () => {
  const result = canDeleteProduct({
    orderItemsCount: 0,
    saleItemsCount: 1,
    stockMovements: [],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /ventas registradas/i);
});

test("blocks deleting products with real stock movements", () => {
  const result = canDeleteProduct({
    orderItemsCount: 0,
    stockMovements: [
      {
        note: "Reposicion semanal",
        reason: "Reposicion",
        type: "ENTRY",
      },
    ],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /movimientos de inventario/i);
});
