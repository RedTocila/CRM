import type { SessionUser } from "@/types/auth";

export function can(user: SessionUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  // Platform super admins have unrestricted access in every tenant
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permission);
}

export function canAny(user: SessionUser | null | undefined, permissions: string[]): boolean {
  return permissions.some((p) => can(user, p));
}

export function canAll(user: SessionUser | null | undefined, permissions: string[]): boolean {
  return permissions.every((p) => can(user, p));
}

export const PERMISSION_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "manage_users",
  "manage_settings",
] as const;
