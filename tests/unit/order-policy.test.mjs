import assert from "node:assert/strict";
import test from "node:test";

import {
  canChangeOrderStructure,
  canDeleteOrder,
  canEditOrderCustomer,
  canPrepareOrderSale,
} from "../../lib/order-policy.ts";
import { canTransitionOrderStatus } from "../../lib/order-status-policy.ts";

test("allows only adjacent active order status transitions", () => {
  assert.equal(canTransitionOrderStatus("PENDING", "CONTACTED"), true);
  assert.equal(canTransitionOrderStatus("CONTACTED", "CONFIRMED"), true);
  assert.equal(canTransitionOrderStatus("CONFIRMED", "CONTACTED"), true);
  assert.equal(canTransitionOrderStatus("CONTACTED", "PENDING"), true);
  assert.equal(canTransitionOrderStatus("PENDING", "CONFIRMED"), false);
  assert.equal(canTransitionOrderStatus("CONFIRMED", "PENDING"), false);
  assert.equal(canTransitionOrderStatus("CONTACTED", "CANCELLED"), false);
});

test("keeps sold order status and customer immutable", () => {
  assert.equal(
    canChangeOrderStructure(true, "CONFIRMED", "CONFIRMED", "customer-1", "customer-1"),
    true,
  );
  assert.equal(
    canChangeOrderStructure(true, "CONFIRMED", "CONTACTED", "customer-1", "customer-1"),
    false,
  );
  assert.equal(
    canChangeOrderStructure(true, "CONFIRMED", "CONFIRMED", "customer-1", "customer-2"),
    false,
  );
});

test("edits or clears the customer only before confirmation", () => {
  assert.equal(canEditOrderCustomer("PENDING", false), false);
  assert.equal(canEditOrderCustomer("CONTACTED", false), true);
  assert.equal(canEditOrderCustomer("CONFIRMED", false), false);
  assert.equal(canEditOrderCustomer("CONTACTED", true), false);
  assert.equal(
    canChangeOrderStructure(false, "CONFIRMED", "CONFIRMED", "customer-1", "customer-2"),
    false,
  );
});

test("allows permanent deletion only before a sale exists", () => {
  assert.equal(canDeleteOrder(false), true);
  assert.equal(canDeleteOrder(true), false);
});

test("prepares a sale only from a confirmed order with customer and without sale", () => {
  assert.equal(canPrepareOrderSale("CONFIRMED", "customer-1", false), true);
  assert.equal(canPrepareOrderSale("CONTACTED", "customer-1", false), false);
  assert.equal(canPrepareOrderSale("CONFIRMED", null, false), false);
  assert.equal(canPrepareOrderSale("CONFIRMED", "customer-1", true), false);
});
