import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic auth gate. The real check happens client-side (GET /auth/me);
// this only avoids flashing protected pages to signed-out visitors.
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get("ss_token")?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!hasToken && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
