import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { PrismaClient } from "@prisma/client";

const port = 32_000 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";
const databaseTest = testDatabaseUrl ? test : test.skip;
const nextBin = fileURLToPath(
  new URL("../../node_modules/next/dist/bin/next", import.meta.url),
);

let server;
let serverOutput = "";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js terminó antes de iniciar.\n${serverOutput}`);
    }

    try {
      const response = await fetch(`${baseUrl}/login`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await delay(250);
  }

  throw new Error(`Next.js no inició dentro del tiempo esperado.\n${serverOutput}`);
}

before(async () => {
  server = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl || process.env.DATABASE_URL,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  await waitForServer();
}, { timeout: 30_000 });

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill();
  for (let attempt = 0; attempt < 20 && server.exitCode === null; attempt += 1) {
    await delay(100);
  }
}, { timeout: 5_000 });

test("serves the login page from the production server", async () => {
  const response = await fetch(`${baseUrl}/login`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Panel administrativo/i);
  assert.match(html, />Ingresar</i);
});

test("redirects unauthenticated administrators to login", async () => {
  const response = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  const location = new URL(response.headers.get("location"));

  assert.ok(response.status === 307 || response.status === 308);
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/admin");
});

test("rejects unauthenticated writes to protected APIs", async () => {
  for (const endpoint of ["/api/customers", "/api/products", "/api/sales"]) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await response.json();

    assert.equal(response.status, 401, endpoint);
    assert.match(body.message, /iniciar sesi[oó]n/i, endpoint);
  }
});

test("validates public order requests before accessing data", async () => {
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [] }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /producto/i);
});

test("validates incomplete login requests without querying users", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /usuario/i);
});

function hashTestPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

databaseTest("creates, updates and safely deletes customers through the API", async () => {
  const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
  const suffix = `${process.pid}${Date.now()}`.slice(-8);
  const adminEmail = `test-${suffix}@invermuebles.com`;
  const password = `Test-${suffix}`;
  const firstDocument = `80${suffix}`.slice(0, 10);
  const protectedDocument = `81${suffix}`.slice(0, 10);
  let firstCustomerId = "";
  let protectedCustomerId = "";

  try {
    await prisma.user.create({
      data: {
        active: true,
        email: adminEmail,
        name: "Administrador de pruebas",
        passwordHash: hashTestPassword(password),
        role: "ADMIN",
      },
    });

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: adminEmail, password }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];

    assert.equal(loginResponse.status, 200);
    assert.ok(sessionCookie);

    const customerData = {
      document: firstDocument,
      email: `cliente-${suffix}@example.com`,
      fullName: "Cliente de integración",
      phone: "3001234567",
      status: "ACTIVE",
    };
    const createResponse = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(customerData),
    });
    const createdCustomer = await createResponse.json();
    firstCustomerId = createdCustomer.id;

    assert.equal(createResponse.status, 201);
    assert.ok(firstCustomerId);

    const duplicateResponse = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(customerData),
    });
    assert.equal(duplicateResponse.status, 409);

    const updateResponse = await fetch(`${baseUrl}/api/customers`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        ...customerData,
        id: firstCustomerId,
        fullName: "Cliente actualizado",
      }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal(
      (await prisma.customer.findUnique({ where: { id: firstCustomerId } }))
        ?.fullName,
      "Cliente actualizado",
    );

    const deleteResponse = await fetch(`${baseUrl}/api/customers`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ id: firstCustomerId }),
    });
    assert.equal(deleteResponse.status, 200);
    firstCustomerId = "";

    const protectedCustomer = await prisma.customer.create({
      data: {
        document: protectedDocument,
        fullName: "Cliente con historial",
        phone: "3007654321",
        orders: {
          create: {
            channel: "WHATSAPP",
            notes: "Pedido de prueba",
            status: "PENDING",
          },
        },
      },
    });
    protectedCustomerId = protectedCustomer.id;

    const protectedDeleteResponse = await fetch(`${baseUrl}/api/customers`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ id: protectedCustomerId }),
    });
    assert.equal(protectedDeleteResponse.status, 409);
  } finally {
    if (firstCustomerId) {
      await prisma.customer.deleteMany({ where: { id: firstCustomerId } });
    }
    if (protectedCustomerId) {
      await prisma.order.deleteMany({ where: { customerId: protectedCustomerId } });
      await prisma.customer.deleteMany({ where: { id: protectedCustomerId } });
    }
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
  }
});
