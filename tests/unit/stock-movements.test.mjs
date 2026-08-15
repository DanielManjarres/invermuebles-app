import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  createMovementForm,
  createStockMovement,
  readStockMovements,
  saveStockMovement,
  stockMovementsStorageKey,
} from "../../lib/stock-movements.ts";

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

function installLocalStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };
  return values;
}

const product = {
  id: "product-1",
  name: "Sala modular",
  reference: "SAL-001",
  category: "Muebles",
  productClass: "Sala",
};

test("creates a clean empty stock movement form", () => {
  assert.deepEqual(createMovementForm(), {
    type: "",
    quantity: "",
    reason: "",
    note: "",
  });
});

test("creates a stock movement snapshot from the product", () => {
  const movement = createStockMovement({
    nextStock: 7,
    note: "  Reposición semanal  ",
    previousStock: 4,
    product,
    quantity: 3,
    reason: "Compra nueva",
    type: "entry",
  });

  assert.equal(movement.productId, product.id);
  assert.equal(movement.productName, product.name);
  assert.equal(movement.previousStock, 4);
  assert.equal(movement.nextStock, 7);
  assert.equal(movement.note, "Reposición semanal");
  assert.equal(movement.user, "Administrador");
  assert.ok(Number.isFinite(Date.parse(movement.createdAtISO)));
});

test("stores newest stock movements first", () => {
  const previousMovement = { id: "previous" };
  const values = installLocalStorage({
    [stockMovementsStorageKey]: JSON.stringify([previousMovement]),
  });
  const movement = { id: "new" };

  saveStockMovement(movement);

  assert.deepEqual(readStockMovements(), [movement, previousMovement]);
  assert.equal(
    values.get(stockMovementsStorageKey),
    JSON.stringify([movement, previousMovement]),
  );
});

test("returns an empty movement list for missing or invalid storage", () => {
  delete globalThis.window;
  assert.deepEqual(readStockMovements(), []);
  assert.doesNotThrow(() => saveStockMovement({ id: "server-movement" }));

  installLocalStorage({ [stockMovementsStorageKey]: "invalid-json" });
  assert.deepEqual(readStockMovements(), []);
});
