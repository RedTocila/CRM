import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { leadListWhere } from "@/lib/leads/access";
import { KANBAN_STATUSES, LOST_STATUSES } from "@/lib/leads/constants";

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const leads = await prisma.lead.findMany({
        where: leadListWhere(user, companyId),
        orderBy: [{ kanbanOrder: "asc" }, { updatedAt: "desc" }],
        include: {
          assignee: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      });

      const columns = [
        ...KANBAN_STATUSES.map((status) => ({
          status,
          leads: leads.filter((l) => l.status === status),
        })),
        {
          status: "LOST",
          leads: leads.filter((l) => LOST_STATUSES.includes(l.status)),
        },
      ];

      return jsonOk({ data: columns });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
