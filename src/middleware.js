import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/* Convenience only — NOT the security boundary.

   Middleware runs on the edge and cannot reach MongoDB, so all it can see is
   whether a session cookie is present. Every page re-reads the session from the
   database via requireUser(), and every API route via requireApiUser(); a
   forged or stale cookie gets past this redirect and is then rejected there. */

const PUBLIC_PREFIXES = [
  "/admin/login",
  "/admin/invite",
  "/admin/forgot-password",
  "/admin/reset-password",
];

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  /* Deliberately no "already signed in → bounce away from /admin/login" rule
     here. Middleware can't tell a valid cookie from an expired one, so that
     rule would ping-pong anyone holding a stale cookie between /admin/login
     and /admin forever. The login page checks the real session instead. */
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
