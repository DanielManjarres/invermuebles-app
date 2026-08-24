export const sessionCookieName = "invermuebles_session";

const sessionDurationSeconds = 60 * 60 * 8;

type AdminSessionPayload = {
  exp: number;
  iat: number;
  role: "admin";
};

function getSessionSecret(secret?: string) {
  const configuredSecret =
    secret ?? process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD;

  if (!configuredSecret) {
    throw new Error("Configura SESSION_SECRET para proteger las sesiones.");
  }

  return configuredSecret;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"],
  );
}

export async function createAdminSessionToken(
  secret?: string,
  now = Date.now(),
) {
  const issuedAt = Math.floor(now / 1000);
  const payload: AdminSessionPayload = {
    exp: issuedAt + sessionDurationSeconds,
    iat: issuedAt,
    role: "admin",
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await importSigningKey(getSessionSecret(secret));
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSessionToken(
  token?: string,
  secret?: string,
  now = Date.now(),
) {
  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  try {
    const [encodedPayload, encodedSignature] = parts;
    const key = await importSigningKey(getSessionSecret(secret));
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );

    if (!validSignature) {
      return false;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as Partial<AdminSessionPayload>;

    return (
      payload.role === "admin" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}
