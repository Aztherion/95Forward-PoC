import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";

export default function ForwardLayout({ children }: { children: ReactNode }) {
  return <AppShell register="95-forward">{children}</AppShell>;
}
