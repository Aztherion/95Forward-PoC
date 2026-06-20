import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";

export default function HostLayout({ children }: { children: ReactNode }) {
  return <AppShell register="host">{children}</AppShell>;
}
