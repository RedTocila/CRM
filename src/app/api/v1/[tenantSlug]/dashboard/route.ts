import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

async function executiveStats(companyId: string) {
  const [leads, contacts, deals, revenue, openTickets] = await Promise.all([
    prisma.lead.count({ where: { companyId, deletedAt: null } }),
    prisma.contact.count({ where: { companyId, deletedAt: null } }),
    prisma.deal.count({ where: { companyId, status: "OPEN", deletedAt: null } }),
    prisma.deal.aggregate({
      where: { companyId, status: "WON", deletedAt: null },
      _sum: { value: true },
    }),
    prisma.ticket.count({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      },
    }),
  ]);

  return {
    leads,
    contacts,
    openDeals: deals,
    wonRevenue: revenue._sum.value ?? 0,
    openTickets,
  };
}

async function salesStats(companyId: string) {
  const [newLeads, qualifiedLeads, openDeals, wonDeals, pipelineValue] =
    await Promise.all([
      prisma.lead.count({
        where: { companyId, deletedAt: null, status: "NEW" },
      }),
      prisma.lead.count({
        where: { companyId, deletedAt: null, status: "QUALIFIED" },
      }),
      prisma.deal.count({
        where: { companyId, deletedAt: null, status: "OPEN" },
      }),
      prisma.deal.count({
        where: { companyId, deletedAt: null, status: "WON" },
      }),
      prisma.deal.aggregate({
        where: { companyId, deletedAt: null, status: "OPEN" },
        _sum: { value: true },
      }),
    ]);

  return {
    newLeads,
    qualifiedLeads,
    openDeals,
    wonDeals,
    pipelineValue: pipelineValue._sum.value ?? 0,
  };
}

async function supportStats(companyId: string) {
  const [open, inProgress, waiting, resolved, urgent] = await Promise.all([
    prisma.ticket.count({
      where: { companyId, deletedAt: null, status: "OPEN" },
    }),
    prisma.ticket.count({
      where: { companyId, deletedAt: null, status: "IN_PROGRESS" },
    }),
    prisma.ticket.count({
      where: { companyId, deletedAt: null, status: "WAITING" },
    }),
    prisma.ticket.count({
      where: { companyId, deletedAt: null, status: "RESOLVED" },
    }),
    prisma.ticket.count({
      where: {
        companyId,
        deletedAt: null,
        priority: "URGENT",
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      },
    }),
  ]);

  return { open, inProgress, waiting, resolved, urgent };
}

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "reports.report.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type") ?? "executive";

      let stats: Record<string, unknown>;
      switch (type) {
        case "sales":
          stats = await salesStats(companyId);
          break;
        case "support":
          stats = await supportStats(companyId);
          break;
        case "executive":
          stats = await executiveStats(companyId);
          break;
        default:
          return jsonError("Invalid dashboard type. Use executive, sales, or support.", 400);
      }

      return jsonOk({ type, stats });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "reports" }
);
