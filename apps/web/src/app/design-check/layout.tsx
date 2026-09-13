import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * The verification gallery renders inside the real Keystone shell, not bare like `/styleguide`.
 *
 * That is the whole point of it. The question a gallery has to answer is not "does the component
 * render" — a test answers that — but "does the amber read as amber against this card, on this
 * background, beside this sidebar, at this width". I24 found a real shell defect that every
 * passing test had walked past, and it found it by looking at a screenshot of the actual shell.
 */
export default async function DesignCheckLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/no-access");
  return (
    <AppShell register="95-forward" user={user}>
      {children}
    </AppShell>
  );
}
