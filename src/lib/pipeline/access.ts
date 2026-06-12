import type { SessionUser } from "@/types/auth";

/** Owner/admin can create, rename, and delete pipelines and stages. */
export function canManagePipelines(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ["owner", "admin"].includes(user.roleSlug ?? "");
}
