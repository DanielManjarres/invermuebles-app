import assert from "node:assert/strict";
import test from "node:test";

import {
  addTax,
  calculateMarginPercent,
  splitTaxIncluded,
  suggestSalePrice,
} from "../../lib/tax-calculator.ts";

test("calculates the 19 percent purchase tax from a base cost", () => {
  assert.deepEqual(addTax(1_000_000), {
    baseAmount: 1_000_000,
    taxAmount: 190_000,
    total: 1_190_000,
  });
});

test("splits a tax-included final price without charging tax twice", () => {
  assert.deepEqual(splitTaxIncluded(1_190_000), {
    baseAmount: 1_000_000,
    taxAmount: 190_000,
    total: 1_190_000,
  });
});

test("suggests an editable final price with a real 25 percent margin", () => {
  const finalPrice = suggestSalePrice(1_000_000);
  assert.equal(finalPrice, 1_586_667);
  assert.equal(calculateMarginPercent(1_000_000, finalPrice), 25);
});
