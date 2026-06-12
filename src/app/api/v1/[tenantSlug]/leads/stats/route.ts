import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { leadListWhere } from "@/lib/leads/access";

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const base = leadListWhere(user, companyId);

      const [
        total,
        newLeads,
        qualified,
        won,
        lost,
        revenueAgg,
        forecastAgg,
        bySource,
        byMonth,
      ] = await Promise.all([
        prisma.lead.count({ where: base }),
        prisma.lead.count({ where: { ...base, status: "NEW" } }),
        prisma.lead.count({ where: { ...base, status: "QUALIFIED" } }),
        prisma.lead.count({ where: { ...base, status: "WON" } }),
        prisma.lead.count({
          where: { ...base, status: { in: ["LOST", "NOT_INTERESTED"] } },
        }),
        prisma.lead.aggregate({
          where: { ...base, status: "WON" },
          _sum: { expectedRevenue: true, leadValue: true },
        }),
        prisma.lead.aggregate({
          where: { ...base, status: { notIn: ["WON", "LOST", "NOT_INTERESTED"] } },
          _sum: { expectedRevenue: true },
        }),
        prisma.lead.groupBy({
          by: ["source"],
          where: base,
          _count: { id: true },
        }),
        prisma.lead.findMany({
          where: {
            ...base,
            createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
          select: { createdAt: true, status: true },
        }),
      ]);

      const conversionRate =
        total > 0 ? Math.round((won / total) * 1000) / 10 : 0;

      const monthMap = new Map<string, number>();
      for (const lead of byMonth) {
        const key = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      }
      const leadsPerMonth = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      const funnel = [
        { stage: "New", count: newLeads },
        { stage: "Qualified", count: qualified },
        { stage: "Won", count: won },
        { stage: "Lost", count: lost },
      ];

      return jsonOk({
        stats: {
          totalLeads: total,
          newLeads,
          qualifiedLeads: qualified,
          wonLeads: won,
          lostLeads: lost,
          conversionRate,
          revenueGenerated: Number(revenueAgg._sum.expectedRevenue ?? revenueAgg._sum.leadValue ?? 0),
          revenueForecast: Number(forecastAgg._sum.expectedRevenue ?? 0),
        },
        charts: {
          leadsPerMonth,
          leadSources: bySource.map((s) => ({
            source: s.source ?? "UNKNOWN",
            count: s._count.id,
          })),
          funnel,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
