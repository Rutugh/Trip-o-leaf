import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("firebase-token");

  // Redirect to login if no token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// More specific matcher - only protect dashboard routes
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (public)
     * - /_next (Next.js internals)
     * - /api (API routes - handle auth separately)
     * - /static, /favicon.ico, etc.
     */
    '/((?!login|_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};