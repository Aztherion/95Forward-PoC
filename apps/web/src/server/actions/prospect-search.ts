"use server";

import { redirect } from "next/navigation";

export async function searchProspectsAction(formData: FormData): Promise<void> {
  const raw = formData.get("q");
  const query = typeof raw === "string" ? raw.trim() : "";
  if (!query) {
    redirect("/95-forward/search");
  }
  redirect(`/95-forward/search?q=${encodeURIComponent(query)}`);
}
