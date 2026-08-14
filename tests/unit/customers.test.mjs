import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteCustomer,
  normalizeCustomerDocument,
  validateCustomerInput,
} from "../../lib/customer-policy.ts";
import { getCustomerPortfolioStatus } from "../../lib/customers.ts";

test("derives overdue status from the customer's credit portfolio", () => {
  assert.equal(getCustomerPortfolioStatus("ACTIVE", 1), "OVERDUE");
  assert.equal(getCustomerPortfolioStatus("OVERDUE", 2), "OVERDUE");
});

test("returns active when the customer has no overdue credits", () => {
  assert.equal(getCustomerPortfolioStatus("ACTIVE", 0), "ACTIVE");
  assert.equal(getCustomerPortfolioStatus("OVERDUE", 0), "ACTIVE");
});

test("preserves administrative restrictions despite overdue credits", () => {
  assert.equal(getCustomerPortfolioStatus("INACTIVE", 2), "INACTIVE");
  assert.equal(getCustomerPortfolioStatus("BLOCKED", 2), "BLOCKED");
});

const validCustomer = {
  document: "1.094.123.456",
  email: "cliente@correo.com",
  fullName: "Cliente de prueba",
  phone: "321 555 1234",
  referencePhone: "310 555 4321",
  status: "ACTIVE",
};

test("normalizes and validates customer identification fields", () => {
  assert.equal(normalizeCustomerDocument(validCustomer.document), "1094123456");
  assert.equal(validateCustomerInput(validCustomer), "");
});

test("rejects invalid document, phone, email and manual overdue status", () => {
  assert.match(
    validateCustomerInput({ ...validCustomer, document: "123" }),
    /cédula/i,
  );
  assert.match(
    validateCustomerInput({ ...validCustomer, phone: "123" }),
    /teléfono/i,
  );
  assert.match(
    validateCustomerInput({ ...validCustomer, email: "correo-inválido" }),
    /correo/i,
  );
  assert.match(
    validateCustomerInput({ ...validCustomer, status: "OVERDUE" }),
    /estado/i,
  );
});

test("allows deleting only customers without commercial history", () => {
  assert.equal(
    canDeleteCustomer({ credits: 0, orders: 0, sales: 0 }).allowed,
    true,
  );
  assert.equal(
    canDeleteCustomer({ credits: 1, orders: 0, sales: 0 }).allowed,
    false,
  );
  assert.equal(
    canDeleteCustomer({ credits: 0, orders: 1, sales: 0 }).allowed,
    false,
  );
  assert.equal(
    canDeleteCustomer({ credits: 0, orders: 0, sales: 1 }).allowed,
    false,
  );
});
