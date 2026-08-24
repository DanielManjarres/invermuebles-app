import assert from "node:assert/strict";
import test from "node:test";

import { getSafeAdminRedirect } from "../../lib/login-redirect.ts";

test("keeps internal administrator redirect paths", () => {
  assert.equal(getSafeAdminRedirect("/admin"), "/admin");
  assert.equal(
    getSafeAdminRedirect("/admin/clientes/cliente-1"),
    "/admin/clientes/cliente-1",
  );
});

test("rejects external and unrelated redirect paths", () => {
  assert.equal(getSafeAdminRedirect("https://example.com"), "/admin");
  assert.equal(getSafeAdminRedirect("//example.com/admin"), "/admin");
  assert.equal(getSafeAdminRedirect("/catalogo"), "/admin");
  assert.equal(getSafeAdminRedirect(null), "/admin");
});
