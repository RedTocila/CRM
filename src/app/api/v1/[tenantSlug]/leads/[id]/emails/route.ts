import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";

const emailSchema = z.object({
  subject: z.string().optional(),
  opened: z.boolean().optional(),
  replied: z.boolean().optional(),
  bounced: z.boolean().optional(),
  sentAt: z.string().datetime().optional(),
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

      const body = emailSchema.parse(await req.json());
      const email = await prisma.leadEmail.create({
        data: {
          companyId,
          leadId: params.id,
          userId: user.id,
          subject: body.subject,
          opened: body.opened ?? false,
          replied: body.replied ?? false,
          bounced: body.bounced ?? false,
          sentAt: body.sentAt ? new Date(body.sentAt) : new Date(),
        },
        include: { user: { select: { id: true, name: true } } },
      });

      await prisma.lead.update({
        where: { id: params.id },
        data: { lastContactDate: email.sentAt },
      });

      await logLeadActivity({
        leadId: params.id,
        userId: user.id,
        type: "email.sent",
        description: body.subject ? `Email: ${body.subject}` : "Email sent",
        metadata: { emailId: email.id },
      });

      return jsonOk({ data: email }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
