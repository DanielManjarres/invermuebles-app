import { NextResponse, type NextRequest } from "next/server";
import {
  sessionCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = await verifyAdminSessionToken(
    request.cookies.get(sessionCookieName)?.value,
  );

  if (pathname.startsWith("/admin") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
