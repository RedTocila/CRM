import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/types/auth";
import { isSalesAgent, resolveAgentId } from "@/lib/agents/scope";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function canAssignLeads(user: SessionUser): boolean {
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.has(user.roleSlug ?? "");
}

/** Sales agents only see leads assigned to them. Admins see all (optional agentId filter). */
export function leadListWhere(
  user: SessionUser,
  companyId: string,
  agentIdParam?: string | null
): Prisma.LeadWhereInput {
  const base: Prisma.LeadWhereInput = { companyId, deletedAt: null };

  if (user.isSuperAdmin) {
    const agentId = resolveAgentId(user, agentIdParam);
    return agentId ? { ...base, assignedToId: agentId } : base;
  }

  if (isSalesAgent(user)) {
    return { ...base, assignedToId: user.id };
  }

  const agentId = resolveAgentId(user, agentIdParam);
  if (agentId) return { ...base, assignedToId: agentId };

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
