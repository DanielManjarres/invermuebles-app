import assert from "node:assert/strict";
import test from "node:test";

import { buildPortfolioAccounts } from "../../lib/portfolio.ts";

function createSale(overrides) {
  return {
    id: "sale-1",
    shortId: "SALE01",
    customerId: "customer-1",
    customerName: "Cliente Prueba",
    customerDocument: "123",
    orderId: "",
    orderShortId: "",
    source: "LOCAL",
    type: "CASH",
    status: "PENDING_DELIVERY",
    paymentMethod: "CASH",
    creditId: "",
    creditMonths: null,
    interestRate: null,
    amountPaid: 1_000_000,
    balance: 0,
    notes: "",
    sistecreditoApproval: "",
    total: 1_000_000,
    createdAt: "12/08/2026, 10:00 a. m.",
    createdAtISO: "2026-08-12T15:00:00.000Z",
    totalQuantity: 1,
    items: [],
    payments: [],
    ...overrides,
  };
}

test("groups cash and Sistecredito sales as paid accounts", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({ id: "cash", shortId: "CASH01" }),
    createSale({
      id: "sistecredito",
      shortId: "SISTE1",
      type: "SISTECREDITO",
      sistecreditoApproval: "APP-123",
    }),
  ]);

  assert.equal(accounts.length, 2);
  assert.ok(accounts.every((account) => account.status === "PAID"));
  assert.equal(accounts.find((account) => account.entityId === "sistecredito")?.payments[0].reference, "APP-123");
});

test("groups an unpaid reserved sale as an open account", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({
      id: "reserved",
      type: "RESERVED",
      amountPaid: 200_000,
      balance: 800_000,
      status: "PENDING_PAYMENT",
    }),
  ]);

  assert.equal(accounts[0].status, "ACTIVE");
  assert.equal(accounts[0].balance, 800_000);
});

test("does not duplicate credit sales outside their credit account", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({ id: "credit-sale", type: "CREDIT", creditId: "credit-1" }),
  ]);

  assert.deepEqual(accounts, []);
});
