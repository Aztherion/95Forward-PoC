import type { Role } from "./roles";

export interface CurrentUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
}
