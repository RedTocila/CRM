import type { SessionUser } from "@/types/auth";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function canManageTeam(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.has(user.roleSlug ?? "");
}

/** Only owner/admin can create accounts or change credentials */
export function canManageAccounts(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ["owner", "admin"].includes(user.roleSlug ?? "");
}
