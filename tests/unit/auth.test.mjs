import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../../lib/auth.ts";

test("hashes passwords with a unique scrypt salt", () => {
  const firstHash = hashPassword("Clave segura 123");
  const secondHash = hashPassword("Clave segura 123");

  assert.match(firstHash, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.notEqual(firstHash, secondHash);
});

test("verifies the correct password and rejects a different one", () => {
  const storedHash = hashPassword("Clave segura 123");

  assert.equal(verifyPassword("Clave segura 123", storedHash), true);
  assert.equal(verifyPassword("Clave incorrecta", storedHash), false);
});

test("rejects malformed or unsupported password hashes", () => {
  assert.equal(verifyPassword("clave", ""), false);
  assert.equal(verifyPassword("clave", "bcrypt:salt:hash"), false);
  assert.equal(verifyPassword("clave", "scrypt:missing"), false);
  assert.equal(verifyPassword("clave", "scrypt:salt:00"), false);
});
