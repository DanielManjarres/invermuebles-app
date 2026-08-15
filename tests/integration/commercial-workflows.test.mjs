import assert from "node:assert/strict";
import test from "node:test";

import {
  canEditOrderCustomer,
  canPrepareOrderSale,
} from "../../lib/order-policy.ts";
import { canTransitionOrderStatus } from "../../lib/order-status-policy.ts";
import { buildPortfolioAccounts } from "../../lib/portfolio.ts";
import { getFinancedSaleDeliveryStatus } from "../../lib/sale-delivery-policy.ts";
import { calculateReservedPayment } from "../../lib/sale-payment-policy.ts";

function createSale(overrides = {}) {
  return {
    id: "sale-1",
    shortId: "SALE01",
    customerId: "customer-1",
    customerName: "Cliente Prueba",
    customerDocument: "123456789",
    orderId: "order-1",
    orderShortId: "ORDER1",
    source: "ORDER",
    type: "RESERVED",
    status: "PENDING_PAYMENT",
    paymentMethod: "CASH",
    creditId: "",
    creditMonths: null,
    interestRate: null,
    amountPaid: 200_000,
    balance: 800_000,
    notes: "",
    sistecreditoApproval: "",
    total: 1_000_000,
    createdAt: "14/08/2026, 10:00 a. m.",
    createdAtISO: "2026-08-14T15:00:00.000Z",
    totalQuantity: 1,
    items: [],
    payments: [],
    ...overrides,
  };
}

test("moves a web order through contact, confirmation and financed delivery", () => {
  assert.equal(canTransitionOrderStatus("PENDING", "CONTACTED"), true);
  assert.equal(canEditOrderCustomer("CONTACTED", false), true);
  assert.equal(canTransitionOrderStatus("CONTACTED", "CONFIRMED"), true);
  assert.equal(canPrepareOrderSale("CONFIRMED", "customer-1", false), true);
  assert.equal(getFinancedSaleDeliveryStatus(0), "PENDING_PAYMENT");
  assert.equal(getFinancedSaleDeliveryStatus(250_000), "PENDING_DELIVERY");
});

test("keeps a separated account open until its final payment", () => {
  const partialPayment = calculateReservedPayment(800_000, 200_000, 300_000);
  const openAccount = buildPortfolioAccounts([], [
    createSale({
      amountPaid: partialPayment.amountPaid,
      balance: partialPayment.balance,
      status: partialPayment.status,
    }),
  ])[0];

  assert.equal(openAccount.status, "ACTIVE");
  assert.equal(openAccount.balance, 500_000);

  const finalPayment = calculateReservedPayment(
    partialPayment.balance,
    partialPayment.amountPaid,
    500_000,
  );
  const paidAccount = buildPortfolioAccounts([], [
    createSale({
      amountPaid: finalPayment.amountPaid,
      balance: finalPayment.balance,
      status: finalPayment.status,
    }),
  ])[0];

  assert.equal(paidAccount.status, "PAID");
  assert.equal(paidAccount.amountPaid, 1_000_000);
  assert.equal(paidAccount.balance, 0);
});

test("keeps delivered financed sales delivered after later payments", () => {
  assert.equal(
    getFinancedSaleDeliveryStatus(500_000, "DELIVERED"),
    "DELIVERED",
  );
});
