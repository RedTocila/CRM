import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { resolveAgentId, isSalesAgent } from "@/lib/agents/scope";
import { agentPerformanceStats } from "@/lib/agents/stats";

function dateRange(filter: string, from?: string | null, to?: string | null) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: end };
    case "week": {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: end };
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: end };
    case "custom":
      return {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: end };
  }
}

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const filter = searchParams.get("filter") ?? "month";
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const agentIdFilter = resolveAgentId(user, searchParams.get("agentId"));
      const range = dateRange(filter, from, to);

      const members = await prisma.companyMember.findMany({
        where: {
          companyId,
          ...(agentIdFilter ? { userId: agentIdFilter } : {}),
          ...(isSalesAgent(user) ? { userId: user.id } : {}),
          ...(!agentIdFilter && !isSalesAgent(user)
            ? { role: { slug: "sales" } }
            : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { slug: true, name: true } },
        },
      });

      const performance = await Promise.all(
        members.map(async (m) => {
          const stats = await agentPerformanceStats(companyId, m.user.id, range);
          return {
            userId: m.user.id,
            name: m.user.name ?? m.user.email,
            email: m.user.email,
            role: m.role.name,
            ...stats,
          };
        })
      );

      const callWhere = {
        companyId,
        calledAt: range,
        ...(agentIdFilter ? { userId: agentIdFilter } : {}),
        ...(isSalesAgent(user) ? { userId: user.id } : {}),
      };

      const callStats = await prisma.leadCall.aggregate({
        where: callWhere,
        _count: { id: true },
        _avg: { duration: true },
        _sum: { duration: true },
      });

      return jsonOk({
        filter,
        agentId: agentIdFilter,
        employees: performance.filter(
          (p) =>
            p.totalLeadsAssigned > 0 || p.callsMade > 0 || p.emailsSent > 0 || agentIdFilter
        ),
        callStats: {
          totalCalls: callStats._count.id,
          avgDuration: Math.round(callStats._avg.duration ?? 0),
          totalDuration: callStats._sum.duration ?? 0,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
