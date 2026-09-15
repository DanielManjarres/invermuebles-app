import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeProductAttributes,
  normalizeProductReference,
  validateProductInventoryInput,
} from "../../lib/product-attribute-policy.ts";

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

test("validates product identity, prices and stock", () => {
  assert.equal(validateProductInventoryInput({
    cost: 800000,
    minimumStock: 1,
    name: "Sala verde",
    reference: "sal-ver-180",
    salePrice: 1200000,
    stock: 3,
  }), "");
  assert.equal(normalizeProductReference(" ref-01 "), "REF-01");
});

test("rejects invalid product identity, prices and stock", () => {
  const validInput = {
    cost: 800000,
    minimumStock: 1,
    name: "Sala verde",
    reference: "SAL-VER-180",
    salePrice: 1200000,
    stock: 3,
  };

  assert.match(validateProductInventoryInput({ ...validInput, name: "x" }), /nombre/);
  assert.match(validateProductInventoryInput({ ...validInput, reference: "x" }), /referencia/);
  assert.match(validateProductInventoryInput({ ...validInput, cost: -1 }), /costo/);
  assert.match(validateProductInventoryInput({ ...validInput, salePrice: -1 }), /precio de venta/);
  assert.match(validateProductInventoryInput({ ...validInput, stock: 1.5 }), /stock inicial/);
  assert.match(validateProductInventoryInput({ ...validInput, minimumStock: -1 }), /stock m.nimo/);
});

test("normalizes option, number and boolean product characteristics", () => {
  const result = normalizeProductAttributes(definitions, [
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

test("rejects missing, repeated and foreign characteristics", () => {
  assert.match(normalizeProductAttributes(definitions, []).error, /Color/);
  assert.match(normalizeProductAttributes(definitions, [
    { attributeId: "color", optionId: "green" },
    { attributeId: "color", optionId: "green" },
  ]).error, /No repitas/);
  assert.match(normalizeProductAttributes(definitions, [
    { attributeId: "unknown", value: "x" },
  ]).error, /no pertenece/);
});

test("rejects invalid characteristic values and skips empty optional ones", () => {
  assert.match(normalizeProductAttributes(definitions, [
    { attributeId: "color", optionId: "inactive" },
    { attributeId: "width", value: "180" },
  ]).error, /opci.n v.lida/);
  assert.match(normalizeProductAttributes(definitions, [
    { attributeId: "color", optionId: "green" },
    { attributeId: "width", value: "ancho" },
  ]).error, /n.mero v.lido/);
  assert.match(normalizeProductAttributes(definitions, [
    { attributeId: "color", optionId: "green" },
    { attributeId: "width", value: "180" },
    { attributeId: "reclining", value: "quiz.s" },
  ]).error, /verdadero o falso/);

  const result = normalizeProductAttributes(definitions, [
    { attributeId: "color", optionId: "green" },
    { attributeId: "width", value: "180" },
  ]);
  assert.equal(result.error, "");
  assert.equal(result.values.length, 2);
});
