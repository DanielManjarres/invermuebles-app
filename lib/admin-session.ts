import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  sessionCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session-token";

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(sessionCookieName)?.value);
}

export async function requireAdminSession() {
  if (await hasAdminSession()) {
    return null;
  }

  return NextResponse.json(
    { message: "Debes iniciar sesion para realizar esta accion." },
    { status: 401 }
  );
}
