import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateNextStock,
  isValidStockQuantity,
} from "../../lib/stock-calculator.ts";

test("calculateNextStock adds stock entries", () => {
  assert.equal(calculateNextStock(4, "entry", 3), 7);
});

test("calculateNextStock subtracts stock exits", () => {
  assert.equal(calculateNextStock(4, "exit", 3), 1);
});

test("calculateNextStock sets stock on adjustment", () => {
  assert.equal(calculateNextStock(4, "adjustment", 10), 10);
});

test("isValidStockQuantity accepts only positive integers", () => {
  assert.equal(isValidStockQuantity(1), true);
  assert.equal(isValidStockQuantity(0), false);
  assert.equal(isValidStockQuantity(-1), false);
  assert.equal(isValidStockQuantity(1.5), false);
});
