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
    variants: [
      {
        active: true,
        attributes: [{ name: "Resolución", unit: "", value: "4K UHD" }],
        cost: 0,
        id: "tv-55",
        isDefault: true,
        location: "",
        minimumStock: 0,
        name: "55 pulgadas · QLED",
        reference: "QN55",
        salePrice: 0,
        stock: 2,
      },
    ],
  },
  {
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

test("searches product, variant reference and attribute values", () => {
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "samsung").length, 1);
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "qn55").length, 1);
  assert.equal(filterCatalogProducts(products, ALL_CATALOG_CATEGORIES, "4k uhd").length, 1);
});

test("combines category and search filters", () => {
  assert.equal(filterCatalogProducts(products, "Muebles", "qled").length, 0);
  assert.equal(filterCatalogProducts(products, "Muebles", "sala").length, 1);
});
