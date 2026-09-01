import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInvoiceNumber,
  formatReceiptNumber,
  normalizeInvoicePrefix,
  validateInitialSaleNumbering,
} from "../../lib/document-numbering.ts";

test("normalizes and formats the electronic invoice code", () => {
  assert.equal(normalizeInvoicePrefix(" fe- "), "FE");
  assert.equal(normalizeInvoicePrefix(" f.e_2026-extra "), "FE20");
  assert.equal(formatInvoiceNumber("FE", 1898), "FE-1898");
  assert.equal(formatInvoiceNumber(null, 1898), "");
  assert.equal(formatInvoiceNumber("FE", null), "");
});

test("formats the independent payment receipt sequence", () => {
  assert.equal(formatReceiptNumber(27), "RC-000027");
  assert.equal(formatReceiptNumber(null), "");
});

test("requires valid starting numbers for the first sale", () => {
  assert.match(validateInitialSaleNumbering(), /Configura/i);
  assert.match(
    validateInitialSaleNumbering({ invoicePrefix: "FE", invoiceStart: 1898, saleStart: 0 }),
    /venta/i,
  );
  assert.match(
    validateInitialSaleNumbering({ invoicePrefix: "FE", invoiceStart: 0, saleStart: 5277 }),
    /factura/i,
  );
  assert.match(
    validateInitialSaleNumbering({ invoicePrefix: "---", invoiceStart: 1898, saleStart: 5277 }),
    /prefijo/i,
  );
  assert.equal(
    validateInitialSaleNumbering({ invoicePrefix: "FE", invoiceStart: 1898, saleStart: 5277 }),
    "",
  );
});
