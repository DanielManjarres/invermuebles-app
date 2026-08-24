import assert from "node:assert/strict";
import test from "node:test";

import { createMovementForm } from "../../lib/stock-movements.ts";

test("creates a clean empty stock movement form", () => {
  assert.deepEqual(createMovementForm(), {
    type: "",
    quantity: "",
    reason: "",
    note: "",
  });
});
