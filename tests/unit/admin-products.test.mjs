import assert from "node:assert/strict";
import test from "node:test";
import { createProductId } from "../../lib/admin-products.ts";

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
