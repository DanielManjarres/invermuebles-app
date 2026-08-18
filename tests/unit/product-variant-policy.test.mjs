import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteProductVariant,
  normalizeVariantAttributes,
  normalizeVariantReference,
  validateVariantInput,
} from "../../lib/product-variant-policy.ts";

const definitions = [
  {
    active: true,
    dataType: "OPTION",
    id: "color",
    name: "Color",
    options: [{ active: true, id: "green", value: "Verde" }],
    required: true,
  },
  {
    active: true,
    dataType: "NUMBER",
    id: "width",
    name: "Ancho",
    options: [],
    required: true,
  },
  {
    active: true,
    dataType: "BOOLEAN",
    id: "reclining",
    name: "Reclinable",
    options: [],
    required: false,
  },
];

test("validates variant identity, prices and stock", () => {
  assert.equal(
    validateVariantInput({
      cost: 800000,
      minimumStock: 1,
      name: "Verde 180 cm",
      reference: "sal-ver-180",
      salePrice: 1200000,
      stock: 3,
    }),
    "",
  );
  assert.match(
    validateVariantInput({
      cost: -1,
      minimumStock: 0,
      name: "Variante",
      reference: "REF-1",
      salePrice: 10,
      stock: 0,
    }),
    /costo/i,
  );
  assert.equal(normalizeVariantReference(" ref-01 "), "REF-01");
});

test("normalizes option, number and boolean attribute values", () => {
  const result = normalizeVariantAttributes(definitions, [
    { attributeId: "color", optionId: "green" },
    { attributeId: "width", value: "180,5" },
    { attributeId: "reclining", value: "TRUE" },
  ]);

  assert.equal(result.error, "");
  assert.deepEqual(result.values, [
    { attributeId: "color", optionId: "green", value: "Verde" },
    { attributeId: "width", optionId: null, value: "180.5" },
    { attributeId: "reclining", optionId: null, value: "true" },
  ]);
});

test("rejects missing required and duplicated attributes", () => {
  assert.match(normalizeVariantAttributes(definitions, []).error, /Color/);
  assert.match(
    normalizeVariantAttributes(definitions, [
      { attributeId: "color", optionId: "green" },
      { attributeId: "color", optionId: "green" },
    ]).error,
    /No repitas/,
  );
});

test("rejects attributes from another product type and invalid options", () => {
  assert.match(
    normalizeVariantAttributes(definitions, [
      { attributeId: "unknown", value: "x" },
    ]).error,
    /no pertenece/,
  );
  assert.match(
    normalizeVariantAttributes(definitions, [
      { attributeId: "color", optionId: "blue" },
      { attributeId: "width", value: "180" },
    ]).error,
    /opción válida/,
  );
});

test("allows deleting an unused non-unique variant with only its initial entry", () => {
  const result = canDeleteProductVariant({
    activeAlternativeCount: 1,
    isDefault: false,
    orderItemsCount: 0,
    saleItemsCount: 0,
    stockMovements: [
      {
        note: "Variante creada desde gestión de productos",
        reason: "Inventario inicial",
        type: "ENTRY",
      },
    ],
    variantCount: 2,
  });

  assert.equal(result.allowed, true);
});

test("protects the only variant and variants with commercial history", () => {
  assert.equal(
    canDeleteProductVariant({
      activeAlternativeCount: 0,
      isDefault: true,
      orderItemsCount: 0,
      saleItemsCount: 0,
      stockMovements: [],
      variantCount: 1,
    }).allowed,
    false,
  );
  assert.equal(
    canDeleteProductVariant({
      activeAlternativeCount: 1,
      isDefault: false,
      orderItemsCount: 1,
      saleItemsCount: 0,
      stockMovements: [],
      variantCount: 2,
    }).allowed,
    false,
  );
});

test("protects variants with later movements and defaults without replacement", () => {
  assert.equal(
    canDeleteProductVariant({
      activeAlternativeCount: 1,
      isDefault: false,
      orderItemsCount: 0,
      saleItemsCount: 0,
      stockMovements: [
        { note: null, reason: "Reposición", type: "ENTRY" },
      ],
      variantCount: 2,
    }).allowed,
    false,
  );
  assert.equal(
    canDeleteProductVariant({
      activeAlternativeCount: 0,
      isDefault: true,
      orderItemsCount: 0,
      saleItemsCount: 0,
      stockMovements: [],
      variantCount: 2,
    }).allowed,
    false,
  );
});
