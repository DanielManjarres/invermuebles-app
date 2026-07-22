import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookieName, sessionCookieValue } from "@/lib/auth";

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value === sessionCookieValue;
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
