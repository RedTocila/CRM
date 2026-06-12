import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/leads/constants";

const moveSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  kanbanOrder: z.number().int().optional(),
});

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "leads.lead.update");
    if (denied) return denied;
    try {
      const existing = await prisma.lead.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Lead not found", 404);
      if (!canAccessLead(user, existing, companyId)) {
        return jsonError("Forbidden", 403);
      }

      const body = moveSchema.parse(await req.json());
      const lead = await prisma.lead.update({
        where: { id: params.id },
        data: {
          status: body.status,
          kanbanOrder: body.kanbanOrder ?? 0,
        },
      });

      if (body.status !== existing.status) {
        await logLeadActivity({
          leadId: lead.id,
          userId: user.id,
          type: "status.changed",
          description: `Moved to ${STATUS_LABELS[body.status] ?? body.status}`,
          metadata: { from: existing.status, to: body.status },
        });
      }

      return jsonOk({ data: lead });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
