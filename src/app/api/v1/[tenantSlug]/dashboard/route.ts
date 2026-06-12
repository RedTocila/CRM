import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { resolveAgentId } from "@/lib/agents/scope";

async function executiveStats(companyId: string, agentId: string | null) {
  const leadFilter = agentId
    ? { companyId, deletedAt: null, assignedToId: agentId }
    : { companyId, deletedAt: null };

  const [leads, contacts, deals, revenue, openTickets] = await Promise.all([
    prisma.lead.count({ where: leadFilter }),
    agentId
      ? prisma.lead.count({ where: { ...leadFilter, status: "WON" } })
      : prisma.contact.count({ where: { companyId, deletedAt: null } }),
    prisma.deal.count({
      where: {
        companyId,
        status: "OPEN",
        deletedAt: null,
        ...(agentId ? { createdById: agentId } : {}),
      },
    }),
    prisma.lead.aggregate({
      where: { ...leadFilter, status: "WON" },
      _sum: { expectedRevenue: true },
    }),
    agentId
      ? Promise.resolve(0)
      : prisma.ticket.count({
          where: {
            companyId,
            deletedAt: null,
            status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
          },
        }),
  ]);

  return {
    leads,
    contacts: agentId ? leads : contacts,
    openDeals: deals,
    wonRevenue: revenue._sum.expectedRevenue ?? 0,
    openTickets,
  };
}

async function salesStats(companyId: string, agentId: string | null) {
  const leadFilter = agentId
    ? { companyId, deletedAt: null, assignedToId: agentId }
    : { companyId, deletedAt: null };

  const [newLeads, qualifiedLeads, openDeals, wonDeals, pipelineValue] =
    await Promise.all([
      prisma.lead.count({ where: { ...leadFilter, status: "NEW" } }),
      prisma.lead.count({ where: { ...leadFilter, status: "QUALIFIED" } }),
      prisma.lead.count({
        where: {
          ...leadFilter,
          status: { notIn: ["WON", "LOST", "NOT_INTERESTED"] },
        },
      }),
      prisma.lead.count({ where: { ...leadFilter, status: "WON" } }),
      prisma.lead.aggregate({
        where: {
          ...leadFilter,
          status: { notIn: ["WON", "LOST", "NOT_INTERESTED"] },
        },
        _sum: { expectedRevenue: true },
      }),
    ]);

  return {
    newLeads,
    qualifiedLeads,
    openDeals,
    wonDeals,
    pipelineValue: pipelineValue._sum.expectedRevenue ?? 0,
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
      const agentId = resolveAgentId(user, searchParams.get("agentId"));

      let stats: Record<string, unknown>;
      switch (type) {
        case "sales":
        case "agent":
          stats = await salesStats(companyId, agentId);
          break;
        case "support":
          if (agentId) {
            stats = { open: 0, inProgress: 0, waiting: 0, resolved: 0, urgent: 0 };
          } else {
            stats = await supportStats(companyId);
          }
          break;
        case "executive":
          stats = await executiveStats(companyId, agentId);
          break;
        default:
          return jsonError("Invalid dashboard type. Use executive, sales, or support.", 400);
      }

      return jsonOk({ type, agentId, stats });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "reports" }
);
