import { NextResponse, type NextRequest } from "next/server";
import { generateSessionCookie } from "@auth0/nextjs-auth0/testing";

const DEFAULT_EMAIL = "dana.reese@waterforpeople.org";

function isEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "true";
}

function deriveName(email: string): string {
  const local = email.split("@")[0];
  if (!local) return "Dev User";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Dev User";
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

async function mint(email: string): Promise<NextResponse> {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "AUTH0_SECRET is not set" }, { status: 500 });
  }

  const cookieValue = await generateSessionCookie(
    {
      user: { sub: `dev|${email}`, email, name: deriveName(email), email_verified: true },
      tokenSet: { accessToken: "test", expiresAt: Math.floor(Date.now() / 1000) + 3600 },
    },
    { secret },
  );

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set("__session", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let email = DEFAULT_EMAIL;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "email" in body) {
      const candidate = (body as { email?: unknown }).email;
      if (typeof candidate === "string" && candidate.length > 0) {
        email = candidate;
      }
    }
  } catch {
    email = DEFAULT_EMAIL;
  }

  return mint(email);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const emailParam = request.nextUrl.searchParams.get("email");
  const email = emailParam && emailParam.length > 0 ? emailParam : DEFAULT_EMAIL;
  return mint(email);
}
