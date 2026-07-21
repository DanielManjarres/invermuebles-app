import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sessionCookieName,
  sessionCookieValue,
  verifyPassword,
} from "@/lib/auth";

type LoginRequest = {
  password?: string;
  user?: string;
};

function cleanText(value?: string) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoginRequest;
  const user = cleanText(body.user).toLowerCase();
  const password = body.password ?? "";

  if (!user || !password) {
    return NextResponse.json(
      { message: "Ingresa usuario y contrasena." },
      { status: 400 }
    );
  }

  const email = user.includes("@") ? user : `${user}@invermuebles.com`;
  const foundUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!foundUser || !foundUser.active || !foundUser.passwordHash) {
    return NextResponse.json(
      { message: "Usuario o contrasena incorrectos." },
      { status: 401 }
    );
  }

  if (!verifyPassword(password, foundUser.passwordHash)) {
    return NextResponse.json(
      { message: "Usuario o contrasena incorrectos." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, sessionCookieValue, {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
