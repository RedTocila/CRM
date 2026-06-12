import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";

const callSchema = z.object({
  duration: z.number().int().min(0),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  calledAt: z.string().datetime().optional(),
});

export const POST = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "leads.lead.update");
    if (denied) return denied;
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!lead) return jsonError("Lead not found", 404);
      if (!canAccessLead(user, lead, companyId)) {
        return jsonError("Forbidden", 403);
      }

      const body = callSchema.parse(await req.json());
      const call = await prisma.leadCall.create({
        data: {
          companyId,
          leadId: params.id,
          userId: user.id,
          duration: body.duration,
          outcome: body.outcome,
          notes: body.notes,
          calledAt: body.calledAt ? new Date(body.calledAt) : new Date(),
        },
        include: { user: { select: { id: true, name: true } } },
      });

      await prisma.lead.update({
        where: { id: params.id },
        data: { lastContactDate: call.calledAt },
      });

      await logLeadActivity({
        leadId: params.id,
        userId: user.id,
        type: "call.logged",
        description: `Call logged (${body.duration}s)`,
        metadata: { callId: call.id, outcome: body.outcome },
      });

      return jsonOk({ data: call }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
