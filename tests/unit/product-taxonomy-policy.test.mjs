import assert from "node:assert/strict";
import test from "node:test";
import {
  canChangeAttributeDataType,
  canDeleteAttribute,
  canDeleteAttributeOption,
  canDeleteCatalogProductType,
  canDeleteCategory,
  createAttributeKey,
  isProductAttributeDataType,
  normalizeAttributePosition,
  normalizeTaxonomyName,
  validateAttributeDefinition,
  validateTaxonomyName,
} from "../../lib/product-taxonomy-policy.ts";

test("normalizes taxonomy names without changing their readable casing", () => {
  assert.equal(normalizeTaxonomyName("  Muebles   de sala "), "Muebles de sala");
});

test("validates required taxonomy names and their maximum length", () => {
  assert.match(validateTaxonomyName("", "de la categoría"), /Escribe/);
  assert.match(validateTaxonomyName("A", "de la categoría"), /entre 2 y 80/);
  assert.match(
    validateTaxonomyName("a".repeat(81), "de la categoría"),
    /entre 2 y 80/,
  );
  assert.equal(validateTaxonomyName("Salas", "de la categoría"), "");
});

test("only deletes empty categories", () => {
  assert.equal(canDeleteCategory({ productTypes: 0 }).allowed, true);
  assert.equal(canDeleteCategory({ productTypes: 1 }).allowed, false);
});

test("only deletes product types without products or attributes", () => {
  assert.equal(
    canDeleteCatalogProductType({ attributes: 0, products: 0 }).allowed,
    true,
  );
  assert.equal(
    canDeleteCatalogProductType({ attributes: 1, products: 0 }).allowed,
    false,
  );
  assert.equal(
    canDeleteCatalogProductType({ attributes: 0, products: 1 }).allowed,
    false,
  );
});

test("creates stable attribute keys from readable names", () => {
  assert.equal(createAttributeKey("  Tamaño del sofá "), "tamano_del_sofa");
  assert.equal(createAttributeKey("Material / Color"), "material_color");
});

test("validates attribute data types, units and positions", () => {
  assert.equal(isProductAttributeDataType("OPTION"), true);
  assert.equal(isProductAttributeDataType("DATE"), false);
  assert.equal(normalizeAttributePosition(3), 3);
  assert.equal(normalizeAttributePosition(-1), 0);
  assert.equal(normalizeAttributePosition(2.5), 0);
  assert.equal(
    validateAttributeDefinition({
      dataType: "NUMBER",
      name: "Ancho",
      unit: "cm",
    }),
    "",
  );
  assert.match(
    validateAttributeDefinition({ dataType: "DATE", name: "Fecha" }),
    /tipo de dato válido/,
  );
});

test("protects attributes and options already used by variants", () => {
  assert.equal(
    canChangeAttributeDataType({ options: 0, values: 0 }).allowed,
    true,
  );
  assert.equal(
    canChangeAttributeDataType({ options: 1, values: 0 }).allowed,
    false,
  );
  assert.equal(canDeleteAttribute({ options: 2, values: 0 }).allowed, true);
  assert.equal(canDeleteAttribute({ options: 0, values: 1 }).allowed, false);
  assert.equal(
    canDeleteAttributeOption({ selectedValues: 1 }).allowed,
    false,
  );
});
