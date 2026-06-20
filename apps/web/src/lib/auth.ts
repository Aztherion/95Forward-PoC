import "server-only";
import { eq, ilike } from "drizzle-orm";
import { users } from "@95forward/db";
import type { CurrentUser } from "@95forward/shared";
import { auth0 } from "@/lib/auth0";
import { getDb } from "@/server/db";

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  const first = parts[0]!.charAt(0);
  const last = parts[parts.length - 1]!.charAt(0);
  return `${first}${last}`.toUpperCase();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) return null;
  // Reject explicitly-unverified emails — guards against email-claim impersonation.
  if (session.user.email_verified === false) return null;

  const db = getDb();
  const matched = await db.query.users.findFirst({
    where: ilike(users.email, email),
  });
  if (!matched) return null;

  const sub = session?.user?.sub;
  if (matched.auth0Subject === null && sub) {
    await db.update(users).set({ auth0Subject: sub }).where(eq(users.id, matched.id));
  }

  return {
    id: matched.id,
    tenantId: matched.tenantId,
    name: matched.name,
    email: matched.email,
    role: matched.role,
    initials: deriveInitials(matched.name),
  };
}
