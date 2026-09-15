import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CATALOG_CATEGORIES,
  filterCatalogProducts,
} from "../../lib/catalog-filter.ts";

const products = [
  {
    catalogCategory: "Electrodomésticos",
    catalogProductType: "Televisor",
    category: "Electrodomésticos",
    details: "Televisor inteligente",
    featured: false,
    id: "tv",
    image: "",
    name: "Televisor Samsung QLED",
    productClass: "Televisor",
    reference: "TV-001",
    salePrice: 0,
    stock: 2,
    visible: true,
    cost: 0,
    attributes: [{ name: "Resolución", unit: "", value: "4K UHD" }],
  },
  {
    attributes: [{ name: "Color", unit: "", value: "Arena" }],
    category: "Muebles",
    cost: 0,
    details: "Sala familiar",
    featured: false,
    id: "sala",
    image: "",
    name: "Sala modular",
    productClass: "Sala",
    reference: "SAL-001",
    salePrice: 0,
    stock: 1,
    visible: true,
  },
];

test("filters catalog products by configured category", () => {
  const result = filterCatalogProducts(products, "Electrodomésticos", "");
  assert.deepEqual(result.map((product) => product.id), ["tv"]);
});

test("searches product reference and characteristic values", () => {
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "samsung").length, 1);
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "tv-001").length, 1);
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "4k uhd").length, 1);
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "arena").length, 1);
});

test("combines category and search filters", () => {
  assert.equal(filterCatalogProducts(products, "Muebles", "qled").length, 0);
  assert.equal(filterCatalogProducts(products, "Muebles", "sala").length, 1);
});
