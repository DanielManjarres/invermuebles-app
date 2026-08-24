import assert from "node:assert/strict";
import test from "node:test";

import { getBalanceAfterPayment, getPaymentReceiptNumber } from "../../lib/payment-receipt.ts";

test("genera un número corto de recibo a partir del pago", () => {
  assert.equal(getPaymentReceiptNumber("cm1234567890"), "34567890");
});

test("calcula el saldo posterior de cada pago histórico", () => {
  const payments = [
    { amount: 100, createdAtISO: "2026-08-24T10:00:00.000Z", id: "older" },
    { amount: 50, createdAtISO: "2026-08-24T11:00:00.000Z", id: "newer" },
  ];

  assert.equal(getBalanceAfterPayment(200, payments, "newer"), 200);
  assert.equal(getBalanceAfterPayment(200, payments, "older"), 250);
});
