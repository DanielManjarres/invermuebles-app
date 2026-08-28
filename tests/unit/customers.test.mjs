import assert from "node:assert/strict";
import test from "node:test";
import {
  canDeleteCustomer,
  isEditableCustomerStatus,
  normalizeCustomerDocument,
  validateCustomerInput,
} from "../../lib/customer-policy.ts";
import {
  getCustomerPaymentAccount,
  getCustomerPaymentLabel,
  getCustomerPortfolioStatus,
} from "../../lib/customers.ts";

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

test("identifies financed payments by credit account", () => {
  assert.deepEqual(
    getCustomerPaymentAccount("CREDIT", "sale-ABC123", "credit-XYZ789"),
    { accountShortId: "XYZ789", accountTitle: "Crédito" },
  );
  assert.deepEqual(
    getCustomerPaymentAccount("CREDIT_CASH", "sale-ABC123", "credit-CASH01"),
    { accountShortId: "CASH01", accountTitle: "Credicontado" },
  );
});

test("identifies direct payment accounts by sale", () => {
  assert.deepEqual(
    getCustomerPaymentAccount("CASH", "sale-CASH01", "unused-credit"),
    { accountShortId: "CASH01", accountTitle: "Contado" },
  );
  assert.deepEqual(
    getCustomerPaymentAccount("RESERVED", "sale-RES001"),
    { accountShortId: "RES001", accountTitle: "Separado" },
  );
  assert.deepEqual(
    getCustomerPaymentAccount("SISTECREDITO", "sale-SIS001"),
    { accountShortId: "SIS001", accountTitle: "Sistecrédito" },
  );
});

test("falls back to the sale when a financed account has no credit id", () => {
  assert.deepEqual(getCustomerPaymentAccount("CREDIT", "sale-FALL01"), {
    accountShortId: "FALL01",
    accountTitle: "Crédito",
  });
});

test("labels payments according to their account type", () => {
  assert.equal(getCustomerPaymentLabel("CASH", true), "Pago de contado");
  assert.equal(
    getCustomerPaymentLabel("SISTECREDITO", true),
    "Pago por Sistecrédito",
  );
  assert.equal(getCustomerPaymentLabel("CREDIT", true), "Pago inicial");
  assert.equal(getCustomerPaymentLabel("CREDIT", false), "Abono");
  assert.equal(getCustomerPaymentLabel("RESERVED", false), "Abono");
});

const validCustomer = {
  document: "1.094.123.456",
  email: "cliente@correo.com",
  fullName: "Cliente de prueba",
  phone: "321 555 1234",
  referenceName: "Contacto de prueba",
  referencePhone: "310 555 4321",
  referenceRelation: "Familiar",
  status: "ACTIVE",
};

test("normalizes and validates customer identification fields", () => {
  assert.equal(normalizeCustomerDocument(validCustomer.document), "1094123456");
  assert.equal(validateCustomerInput(validCustomer), "");
});

test("accepts boundary lengths and empty optional contact fields", () => {
  assert.equal(
    validateCustomerInput({
      ...validCustomer,
      document: "123456",
      email: "",
      phone: "1234567",
      referenceName: "",
      referencePhone: "",
      referenceRelation: "",
    }),
    "",
  );
  assert.equal(
    validateCustomerInput({
      ...validCustomer,
      document: "123456789012345",
      phone: "123456789012345",
    }),
    "",
  );
});

test("rejects missing names and invalid reference phones", () => {
  assert.match(
    validateCustomerInput({ ...validCustomer, fullName: "   " }),
    /nombre/i,
  );
  assert.match(
    validateCustomerInput({ ...validCustomer, referencePhone: "123" }),
    /contacto/i,
  );
});

test("requires complete reference contact details when one is provided", () => {
  assert.match(
    validateCustomerInput({
      ...validCustomer,
      referencePhone: "",
      referenceRelation: "",
    }),
    /completa/i,
  );
  assert.match(
    validateCustomerInput({
      ...validCustomer,
      referenceName: "",
    }),
    /completa/i,
  );
  assert.equal(
    validateCustomerInput({
      ...validCustomer,
      referenceName: "",
      referencePhone: "",
      referenceRelation: "",
    }),
    "",
  );
});

test("only allows administratively editable customer statuses", () => {
  assert.equal(isEditableCustomerStatus("ACTIVE"), true);
  assert.equal(isEditableCustomerStatus("INACTIVE"), true);
  assert.equal(isEditableCustomerStatus("BLOCKED"), true);
  assert.equal(isEditableCustomerStatus("OVERDUE"), false);
  assert.equal(isEditableCustomerStatus(undefined), false);
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
  assert.match(
    canDeleteCustomer({ credits: 1, orders: 1, sales: 1 }).reason,
    /historial/i,
  );
});
