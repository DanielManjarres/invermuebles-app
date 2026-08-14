import assert from "node:assert/strict";
import test from "node:test";
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
