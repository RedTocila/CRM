import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { createNotification } from "@/lib/leads/notifications";
import { FOLLOW_UP_TYPES } from "@/lib/leads/constants";

const followUpSchema = z.object({
  type: z.enum(FOLLOW_UP_TYPES),
  dueAt: z.string().datetime(),
  assignedToId: z.string(),
  notes: z.string().optional(),
});

const completeSchema = z.object({
  followUpId: z.string(),
  completed: z.boolean(),
});

export const POST = withApi(
  async (req, { companyId, user, params, companySlug }) => {
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

      const body = followUpSchema.parse(await req.json());
      const followUp = await prisma.leadFollowUp.create({
        data: {
          companyId,
          leadId: params.id,
          assignedToId: body.assignedToId,
          type: body.type,
          dueAt: new Date(body.dueAt),
          notes: body.notes,
        },
        include: { assignee: { select: { id: true, name: true } } },
      });

      await prisma.lead.update({
        where: { id: params.id },
        data: { nextFollowUpDate: followUp.dueAt },
      });

      await logLeadActivity({
        leadId: params.id,
        userId: user.id,
        type: "followup.scheduled",
        description: `${body.type} follow-up scheduled`,
      });

      await createNotification({
        userId: body.assignedToId,
        companyId,
        type: "FOLLOW_UP_DUE",
        title: "Follow-up scheduled",
        body: `Follow-up for ${lead.firstName} on ${followUp.dueAt.toLocaleDateString()}`,
        link: `/app/${companySlug}/leads/${params.id}`,
      });

      return jsonOk({ data: followUp }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const PATCH = withApi(
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

      const body = completeSchema.parse(await req.json());
      const followUp = await prisma.leadFollowUp.update({
        where: { id: body.followUpId },
        data: {
          completed: body.completed,
          completedAt: body.completed ? new Date() : null,
        },
      });

      if (body.completed) {
        await logLeadActivity({
          leadId: params.id,
          userId: user.id,
          type: "followup.completed",
          description: "Follow-up completed",
        });
      }

      return jsonOk({ data: followUp });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
