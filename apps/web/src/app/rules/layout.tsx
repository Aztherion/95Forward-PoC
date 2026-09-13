import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Top-level `/rules`, not `/95-forward/rules`. The RULE chips that carry every finding, every
// ranked row and every number link here; a short, stable path is what makes that link cheap to
// write from anywhere and cheap to keep working. The shell is 95 Forward's — the doctrine belongs
// to the add-on, not to the host CRM.
export default async function RulesLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/no-access");
  return (
    <AppShell register="95-forward" user={user}>
      {children}
    </AppShell>
  );
}
