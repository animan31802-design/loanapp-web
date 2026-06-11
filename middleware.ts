/**
 * middleware.ts — route-level auth guard
 *
 * Protects /admin/* routes by checking for a Firebase session cookie.
 * If no cookie is present the user is redirected to /login before any
 * admin page component ever renders, eliminating the flash-of-admin-UI
 * that the useEffect redirect approach allowed.
 *
 * How it works:
 *  - Firebase client SDK stores its auth token in IndexedDB (not cookies),
 *    so we rely on a lightweight custom session cookie set by the app on
 *    successful login (see AuthContext.tsx for the setSessionCookie helper).
 *  - The middleware only checks for the *presence* of the cookie, not its
 *    validity — actual role verification still happens server-side in each
 *    API route, and client-side in AuthContext for the member/admin split.
 *  - For a stronger guarantee in production, replace the cookie check with
 *    Firebase Admin SDK session cookie verification in the middleware body.
 */

import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "loanapp_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all /admin/** paths except Next.js internals and static assets
  matcher: ["/admin/:path*"],
};
