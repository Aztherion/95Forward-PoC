import type { CurrentUser } from "@95forward/shared";

export function getCurrentUser(): CurrentUser {
  return {
    id: "stub-dana-reese",
    name: "Dana Reese",
    role: "Major Gifts Officer",
    email: "dana.reese@waterforpeople.org",
    org: "Water For People",
    initials: "DR",
  };
}
