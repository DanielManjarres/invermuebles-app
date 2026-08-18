import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteCatalogProductType,
  canDeleteCategory,
  normalizeTaxonomyName,
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
