export type Role = "major_gifts_officer" | "gift_officer" | "chief_development_officer";

export const ROLES: Role[] = ["major_gifts_officer", "gift_officer", "chief_development_officer"];

export const ROLE_LABELS: Record<Role, string> = {
  major_gifts_officer: "Major Gifts Officer",
  gift_officer: "Gift Officer",
  chief_development_officer: "Chief Development Officer",
};

export function isLeadership(role: Role): boolean {
  return role === "chief_development_officer";
}

export function canViewTeamScope(role: Role): boolean {
  return isLeadership(role);
}
