import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { leadListWhere } from "@/lib/leads/access";
import { getKanbanColumns, leadsForKanbanColumn } from "@/lib/leads/kanban-columns";

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const agentId = new URL(req.url).searchParams.get("agentId");
      const [columnConfig, leads] = await Promise.all([
        getKanbanColumns(companyId),
        prisma.lead.findMany({
          where: leadListWhere(user, companyId, agentId),
          orderBy: [{ kanbanOrder: "asc" }, { updatedAt: "desc" }],
          include: {
            assignee: { select: { id: true, name: true } },
            tags: { include: { tag: true } },
          },
        }),
      ]);

      const columns = columnConfig.map((col) => ({
        statusKey: col.statusKey,
        label: col.label,
        order: col.order,
        leads: leadsForKanbanColumn(leads, col.statusKey),
      }));

      return jsonOk({ data: columns, columns: columnConfig });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
