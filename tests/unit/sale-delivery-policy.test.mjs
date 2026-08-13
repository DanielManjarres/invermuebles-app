import assert from "node:assert/strict";
import test from "node:test";

import { getFinancedSaleDeliveryStatus } from "../../lib/sale-delivery-policy.ts";

test("keeps financed sales pending until they receive an initial payment", () => {
  assert.equal(getFinancedSaleDeliveryStatus(0), "PENDING_PAYMENT");
});

test("makes a financed sale ready for delivery after any payment", () => {
  assert.equal(getFinancedSaleDeliveryStatus(1), "PENDING_DELIVERY");
});

test("does not regress an already delivered sale after later payments", () => {
  assert.equal(getFinancedSaleDeliveryStatus(100_000, "DELIVERED"), "DELIVERED");
});
