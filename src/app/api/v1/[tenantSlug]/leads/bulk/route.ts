import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAssignLeads } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { notifyLeadAssigned } from "@/lib/leads/notifications";
import { LEAD_STATUSES, LEAD_PRIORITIES } from "@/lib/leads/constants";

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    leadIds: z.array(z.string()).min(1),
    assignedToId: z.string().nullable(),
  }),
  z.object({
    action: z.literal("delete"),
    leadIds: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("update"),
    leadIds: z.array(z.string()).min(1),
    status: z.enum(LEAD_STATUSES).optional(),
    priority: z.enum(LEAD_PRIORITIES).optional(),
    assignedToId: z.string().nullable().optional(),
  }),
]);

export const POST = withApi(
  async (req, { companyId, user, companySlug }) => {
    if (!canAssignLeads(user)) {
      return jsonError("Only admins can perform bulk lead actions", 403);
    }
    const denied = requirePerm(user, "leads.lead.update");
    if (denied) return denied;

    try {
      const body = bulkSchema.parse(await req.json());
      const leads = await prisma.lead.findMany({
        where: { id: { in: body.leadIds }, companyId, deletedAt: null },
      });
      if (leads.length !== body.leadIds.length) {
        return jsonError("Some leads were not found", 404);
      }

      if (body.action === "delete") {
        await prisma.lead.updateMany({
          where: { id: { in: body.leadIds }, companyId },
          data: { deletedAt: new Date() },
        });
        return jsonOk({ affected: body.leadIds.length, action: "delete" });
      }

      if (body.action === "assign") {
        await prisma.lead.updateMany({
          where: { id: { in: body.leadIds }, companyId },
          data: { assignedToId: body.assignedToId },
        });
        for (const lead of leads) {
          await logLeadActivity({
            leadId: lead.id,
            userId: user.id,
            type: "lead.assigned",
            description: "Bulk assigned",
            metadata: { assignedToId: body.assignedToId },
          });
          if (body.assignedToId) {
            await notifyLeadAssigned({
              assigneeId: body.assignedToId,
              companyId,
              leadId: lead.id,
              leadName: `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
              tenantSlug: companySlug,
            });
          }
        }
        return jsonOk({ affected: body.leadIds.length, action: "assign" });
      }

      const { leadIds, action: _action, ...updates } = body;
      const data: Record<string, unknown> = {};
      if (updates.status) data.status = updates.status;
      if (updates.priority) data.priority = updates.priority;
      if (updates.assignedToId !== undefined) data.assignedToId = updates.assignedToId;

      await prisma.lead.updateMany({
        where: { id: { in: leadIds }, companyId },
        data,
      });
      return jsonOk({ affected: leadIds.length, action: "update" });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
