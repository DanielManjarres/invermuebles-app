import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "../../lib/admin-session-token.ts";

const secret = "secreto-de-pruebas-con-suficiente-longitud";
const now = Date.UTC(2026, 7, 24, 12);

test("creates and verifies a signed administrator session", async () => {
  const token = await createAdminSessionToken(secret, now);

  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(await verifyAdminSessionToken(token, secret, now), true);
});

test("rejects tampered, malformed and missing sessions", async () => {
  const token = await createAdminSessionToken(secret, now);
  const [payload, signature] = token.split(".");

  assert.equal(
    await verifyAdminSessionToken(`${payload}x.${signature}`, secret, now),
    false,
  );
  assert.equal(await verifyAdminSessionToken(token, "otro-secreto", now), false);
  assert.equal(await verifyAdminSessionToken("sin-firma", secret, now), false);
  assert.equal(await verifyAdminSessionToken(undefined, secret, now), false);
});

test("rejects an expired administrator session", async () => {
  const token = await createAdminSessionToken(secret, now);
  const nineHoursLater = now + 9 * 60 * 60 * 1000;

  assert.equal(
    await verifyAdminSessionToken(token, secret, nineHoursLater),
    false,
  );
});
