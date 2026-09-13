import { redirect } from "next/navigation";

// The Board is the landing. It lives at its own path rather than at `/95-forward` so that nav
// active-state works: `isActive` treats a href as active for its whole subtree, so a nav item
// pointing at `/95-forward` would light up on every add-on screen.
export default function ForwardIndexPage() {
  redirect("/95-forward/board");
}
