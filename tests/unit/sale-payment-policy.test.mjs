import assert from "node:assert/strict";
import test from "node:test";
import { calculateReservedPayment } from "../../lib/sale-payment-policy.ts";

test("keeps a reserved sale pending while a balance remains", () => {
  assert.deepEqual(calculateReservedPayment(800_000, 200_000, 300_000), {
    amountPaid: 500_000,
    balance: 500_000,
    status: "PENDING_PAYMENT",
  });
});

test("moves a fully paid reserved sale to pending delivery", () => {
  assert.deepEqual(calculateReservedPayment(800_000, 200_000, 800_000), {
    amountPaid: 1_000_000,
    balance: 0,
    status: "PENDING_DELIVERY",
  });
});

test("rejects payments above the pending balance", () => {
  assert.throws(
    () => calculateReservedPayment(800_000, 200_000, 800_001),
    /PAYMENT_OVER_BALANCE/,
  );
});

test("rejects non-positive payments", () => {
  assert.throws(
    () => calculateReservedPayment(800_000, 200_000, 0),
    /INVALID_PAYMENT_AMOUNT/,
  );
});
