import type { SessionUser } from "@/types/auth";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function isSalesAgent(user: SessionUser): boolean {
  if (user.isSuperAdmin) return false;
  return user.roleSlug === "sales";
}

export function isAdminUser(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.has(user.roleSlug ?? "");
}

/** Resolve which agent's data to show. Sales always see themselves; admins may pass agentId. */
export function resolveAgentId(
  user: SessionUser,
  agentIdParam?: string | null
): string | null {
  if (isSalesAgent(user)) return user.id;
  if (agentIdParam && isAdminUser(user)) return agentIdParam;
  return null;
}

export function canViewAgentProfile(
  user: SessionUser,
  targetUserId: string
): boolean {
  if (user.isSuperAdmin) return true;
  if (user.id === targetUserId) return true;
  return isAdminUser(user);
}
