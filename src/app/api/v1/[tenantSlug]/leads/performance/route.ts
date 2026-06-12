import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

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
      const range = dateRange(filter, from, to);

      const members = await prisma.companyMember.findMany({
        where: { companyId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { slug: true, name: true } },
        },
      });

      const performance = await Promise.all(
        members.map(async (m) => {
          const userId = m.user.id;
          const leadWhere = {
            companyId,
            deletedAt: null,
            assignedToId: userId,
            ...(range.gte || range.lte ? { createdAt: range } : {}),
          };

          const [
            assigned,
            contacted,
            qualified,
            won,
            lost,
            calls,
            emails,
            comments,
            followUpsDone,
            revenue,
          ] = await Promise.all([
            prisma.lead.count({ where: leadWhere }),
            prisma.lead.count({
              where: { ...leadWhere, status: { not: "NEW" } },
            }),
            prisma.lead.count({
              where: { ...leadWhere, status: "QUALIFIED" },
            }),
            prisma.lead.count({ where: { ...leadWhere, status: "WON" } }),
            prisma.lead.count({
              where: {
                ...leadWhere,
                status: { in: ["LOST", "NOT_INTERESTED"] },
              },
            }),
            prisma.leadCall.count({
              where: {
                companyId,
                userId,
                calledAt: range,
              },
            }),
            prisma.leadEmail.count({
              where: {
                companyId,
                userId,
                sentAt: range,
              },
            }),
            prisma.leadNote.count({
              where: {
                userId,
                createdAt: range,
                lead: { companyId },
              },
            }),
            prisma.leadFollowUp.count({
              where: {
                companyId,
                assignedToId: userId,
                completed: true,
                completedAt: range,
              },
            }),
            prisma.lead.aggregate({
              where: { ...leadWhere, status: "WON" },
              _sum: { expectedRevenue: true },
            }),
          ]);

          const conversionRate =
            assigned > 0 ? Math.round((won / assigned) * 1000) / 10 : 0;

          return {
            userId,
            name: m.user.name ?? m.user.email,
            email: m.user.email,
            role: m.role.name,
            totalLeadsAssigned: assigned,
            leadsContacted: contacted,
            leadsQualified: qualified,
            leadsWon: won,
            leadsLost: lost,
            callsMade: calls,
            emailsSent: emails,
            commentsAdded: comments,
            followUpsCompleted: followUpsDone,
            revenueGenerated: Number(revenue._sum.expectedRevenue ?? 0),
            conversionRate,
          };
        })
      );

      const callStats = await prisma.leadCall.aggregate({
        where: { companyId, calledAt: range },
        _count: { id: true },
        _avg: { duration: true },
        _sum: { duration: true },
      });

      return jsonOk({
        filter,
        employees: performance.filter((p) => p.totalLeadsAssigned > 0 || p.callsMade > 0 || p.emailsSent > 0),
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
