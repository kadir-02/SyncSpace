import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The landing page and authentication pages are public.
// Protected app routes still require a token; the client performs the real
// session check with GET /auth/me.
const PUBLIC_PAGES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get("cohvra_token")?.value);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Allow public pages, including the landing page, without authentication.
  if (!hasToken && isPublicPage) {
    return NextResponse.next();
  }

  // Keep unauthenticated visitors out of protected application routes.
  if (!hasToken && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Signed-in users should enter the application, not return to auth screens.
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
