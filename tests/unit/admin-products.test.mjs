import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  adminProductsStorageKey,
  createProductId,
  readAdminProducts,
  saveAdminProducts,
} from "../../lib/admin-products.ts";

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

test("createProductId creates a readable id from product name", () => {
  const id = createProductId("Sala Turca Gris", []);

  assert.equal(id, "sala-turca-gris");
});

test("createProductId removes accents and symbols", () => {
  const id = createProductId("Cómoda / TV 55 pulgadas!", []);

  assert.equal(id, "comoda-tv-55-pulgadas");
});

test("createProductId avoids duplicated ids", () => {
  const id = createProductId("Sala Turca Gris", [
    { id: "sala-turca-gris" },
    { id: "sala-turca-gris-2" },
  ]);

  assert.equal(id, "sala-turca-gris-3");
});

test("readAdminProducts uses fallback data outside the browser", () => {
  delete globalThis.window;
  const fallback = [{ id: "fallback" }];

  assert.equal(readAdminProducts(fallback), fallback);
  assert.doesNotThrow(() => saveAdminProducts(fallback));
});

test("stores and reads admin products from local storage", () => {
  const values = installLocalStorage();
  const storedProducts = [{ id: "stored-product" }];

  saveAdminProducts(storedProducts);

  assert.deepEqual(readAdminProducts([]), storedProducts);
  assert.equal(
    values.get(adminProductsStorageKey),
    JSON.stringify(storedProducts),
  );
});

test("falls back when stored product data is invalid", () => {
  installLocalStorage({ [adminProductsStorageKey]: "invalid-json" });
  const fallback = [{ id: "fallback" }];

  assert.equal(readAdminProducts(fallback), fallback);
});
