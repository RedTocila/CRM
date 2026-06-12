import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function canAssignLeads(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.has(user.roleSlug ?? "");
}

/** Sales agents only see leads assigned to them. Company admins see all (including unassigned inbox). */
export function leadListWhere(
  user: SessionUser,
  companyId: string
): Prisma.LeadWhereInput {
  const base: Prisma.LeadWhereInput = { companyId, deletedAt: null };

  if (user.isSuperAdmin) return base;

  if (user.roleSlug === "sales") {
    return { ...base, assignedToId: user.id };
  }

  return base;
}

export function canAccessLead(
  user: SessionUser,
  lead: { assignedToId: string | null; companyId: string },
  companyId: string
): boolean {
  if (user.isSuperAdmin) return true;
  if (lead.companyId !== companyId) return false;
  if (user.roleSlug === "sales") {
    return lead.assignedToId === user.id;
  }
  return true;
}
