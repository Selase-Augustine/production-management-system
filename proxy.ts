import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/verify-session-token";

const PUBLIC_PATHS = new Set(["/login"]);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  );
}

function safeNext() {
  return NextResponse.next();
}

function safeLoginRedirect(request: NextRequest, pathname: string) {
  try {
    const url = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/login") {
      url.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(url);
  } catch {
    return safeNext();
  }
}

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    if (isPublicAsset(pathname)) {
      return safeNext();
    }

    const authenticated = await verifySessionToken(
      request.cookies.get("pms_session")?.value,
      process.env.AUTH_SECRET,
    );

    if (PUBLIC_PATHS.has(pathname)) {
      if (authenticated) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return safeNext();
    }

    if (!authenticated) {
      return safeLoginRedirect(request, pathname);
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return safeNext();
  } catch {
    const pathname = request.nextUrl?.pathname ?? "";
    if (pathname === "/login") {
      return safeNext();
    }
    return safeLoginRedirect(request, pathname);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|_vercel|favicon.ico|.*\\..*).*)",
  ],
};
