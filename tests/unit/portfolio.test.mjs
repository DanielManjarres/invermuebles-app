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

function createCredit(overrides = {}) {
  return {
    id: "credit-1",
    shortId: "CRED01",
    saleId: "sale-credit-1",
    saleShortId: "SALEC1",
    customerId: "customer-1",
    customerName: "Cliente Prueba",
    customerDocument: "123",
    customerPhone: "3001234567",
    saleType: "CREDIT",
    saleTypeLabel: "Crédito",
    status: "ACTIVE",
    statusLabel: "Activo",
    months: 6,
    interestRate: 20,
    principal: 1_000_000,
    total: 1_200_000,
    outstandingPrincipal: 800_000,
    interestBalance: 160_000,
    balance: 960_000,
    saleTotal: 1_000_000,
    amountPaid: 240_000,
    createdAt: "12/08/2026, 10:00 a. m.",
    createdAtISO: "2026-08-12T15:00:00.000Z",
    updatedAt: "12/08/2026, 10:00 a. m.",
    lastPaymentAt: "12/08/2026, 10:00 a. m.",
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
  assert.equal(accounts.find((account) => account.entityId === "cash")?.title, "Contado");
  assert.equal(accounts.find((account) => account.entityId === "sistecredito")?.payments[0].reference, "APP-123");
});

test("preserves real Sistecredito payments instead of adding a synthetic duplicate", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({
      id: "sistecredito",
      type: "SISTECREDITO",
      payments: [
        {
          id: "payment-1",
          amount: 1_000_000,
          method: "TRANSFER",
          reference: "APP-456",
          note: "Pago confirmado",
          isInitial: true,
          createdAt: "12/08/2026, 10:00 a. m.",
        },
      ],
    }),
  ]);

  assert.equal(accounts[0].payments.length, 1);
  assert.equal(accounts[0].payments[0].id, "payment-1");
  assert.equal(accounts[0].payments[0].methodLabel, "Transferencia");
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

test("moves a fully paid reserved sale into paid accounts", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({
      id: "reserved-paid",
      type: "RESERVED",
      balance: 0,
      status: "PENDING_DELIVERY",
    }),
  ]);

  assert.equal(accounts[0].status, "PAID");
  assert.equal(accounts[0].statusLabel, "Pagado");
});

test("does not duplicate credit sales outside their credit account", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({ id: "credit-sale", type: "CREDIT", creditId: "credit-1" }),
  ]);

  assert.deepEqual(accounts, []);
});

test("maps credit status, balance and payment allocation", () => {
  const accounts = buildPortfolioAccounts([
    createCredit({
      status: "OVERDUE",
      statusLabel: "En mora",
      payments: [
        {
          id: "credit-payment-1",
          amount: 100_000,
          method: "CASH",
          methodLabel: "Efectivo",
          reference: "REC-1",
          note: "Abono",
          principalAmount: 80_000,
          interestAmount: 20_000,
          isInitial: false,
          createdAt: "12/08/2026, 11:00 a. m.",
          createdAtISO: "2026-08-12T16:00:00.000Z",
          userName: "Administrador",
        },
      ],
    }),
  ], []);

  assert.equal(accounts[0].source, "CREDIT");
  assert.equal(accounts[0].status, "OVERDUE");
  assert.equal(accounts[0].balance, 960_000);
  assert.equal(accounts[0].payments[0].principalAmount, 80_000);
  assert.equal(accounts[0].payments[0].interestAmount, 20_000);
});

test("maps fully paid credits into paid accounts", () => {
  const accounts = buildPortfolioAccounts([
    createCredit({
      status: "PAID",
      statusLabel: "Pagado",
      outstandingPrincipal: 0,
      interestBalance: 0,
      balance: 0,
      amountPaid: 1_200_000,
    }),
  ], []);

  assert.equal(accounts[0].status, "PAID");
  assert.equal(accounts[0].balance, 0);
});

test("excludes sales without a customer and sorts accounts newest first", () => {
  const accounts = buildPortfolioAccounts([], [
    createSale({
      id: "without-customer",
      customerId: "",
      createdAtISO: "2026-08-14T15:00:00.000Z",
    }),
    createSale({
      id: "older",
      shortId: "OLDER1",
      createdAtISO: "2026-08-11T15:00:00.000Z",
    }),
    createSale({
      id: "newer",
      shortId: "NEWER1",
      createdAtISO: "2026-08-13T15:00:00.000Z",
    }),
  ]);

  assert.deepEqual(accounts.map((account) => account.entityId), ["newer", "older"]);
});
