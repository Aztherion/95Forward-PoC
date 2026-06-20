import { NextResponse, type NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/login") return true;
  if (pathname === "/api/test-login") {
    return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";
  }
  return false;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const authResponse = await auth0.middleware(request);

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (!session) {
    const loginUrl = new URL(`/login?returnTo=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
