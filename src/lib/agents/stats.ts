import { prisma } from "@/lib/db";
import { resolveAgentId } from "@/lib/agents/scope";
import type { SessionUser } from "@/types/auth";

export async function agentLeadWhere(
  user: SessionUser,
  companyId: string,
  agentIdParam?: string | null
) {
  const agentId = resolveAgentId(user, agentIdParam);
  const base = { companyId, deletedAt: null as null };
  if (agentId) return { ...base, assignedToId: agentId };
  return base;
}

export async function agentPerformanceStats(
  companyId: string,
  userId: string,
  range?: { gte?: Date; lte?: Date }
) {
  const leadWhere = {
    companyId,
    deletedAt: null,
    assignedToId: userId,
    ...(range?.gte || range?.lte ? { createdAt: range } : {}),
  };

  const [
    assigned,
    contacted,
    qualified,
    won,
    lost,
    calls,
    emails,
    followUpsDone,
    revenue,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: { not: "NEW" } } }),
    prisma.lead.count({ where: { ...leadWhere, status: "QUALIFIED" } }),
    prisma.lead.count({ where: { ...leadWhere, status: "WON" } }),
    prisma.lead.count({
      where: { ...leadWhere, status: { in: ["LOST", "NOT_INTERESTED"] } },
    }),
    prisma.leadCall.count({
      where: {
        companyId,
        userId,
        ...(range?.gte || range?.lte ? { calledAt: range } : {}),
      },
    }),
    prisma.leadEmail.count({
      where: {
        companyId,
        userId,
        ...(range?.gte || range?.lte ? { sentAt: range } : {}),
      },
    }),
    prisma.leadFollowUp.count({
      where: {
        companyId,
        assignedToId: userId,
        completed: true,
        ...(range?.gte || range?.lte ? { completedAt: range } : {}),
      },
    }),
    prisma.lead.aggregate({
      where: { ...leadWhere, status: "WON" },
      _sum: { expectedRevenue: true },
    }),
  ]);

  const conversionRate = assigned > 0 ? Math.round((won / assigned) * 1000) / 10 : 0;

  return {
    totalLeadsAssigned: assigned,
    leadsContacted: contacted,
    leadsQualified: qualified,
    leadsWon: won,
    leadsLost: lost,
    callsMade: calls,
    emailsSent: emails,
    followUpsCompleted: followUpsDone,
    revenueGenerated: Number(revenue._sum.expectedRevenue ?? 0),
    conversionRate,
  };
}
