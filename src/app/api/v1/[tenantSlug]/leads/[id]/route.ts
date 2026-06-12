import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { notifyLeadAssigned } from "@/lib/leads/notifications";
import { createNotification } from "@/lib/leads/notifications";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  STATUS_LABELS,
} from "@/lib/leads/constants";

const updateLeadSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional().nullable(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  assignedToId: z.string().optional().nullable(),
  lastContactDate: z.string().datetime().optional().nullable(),
  nextFollowUpDate: z.string().datetime().optional().nullable(),
  leadValue: z.number().optional().nullable(),
  expectedRevenue: z.number().optional().nullable(),
  conversionProbability: z.number().int().min(0).max(100).optional().nullable(),
  score: z.number().int().optional(),
  tagIds: z.array(z.string()).optional(),
});

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

const leadInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  creator: { select: { id: true, name: true, email: true } },
  tags: { include: { tag: true } },
  notes: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  activities: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  calls: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { calledAt: "desc" as const },
  },
  emails: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { sentAt: "desc" as const },
  },
  followUps: {
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { dueAt: "asc" as const },
  },
};

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
        include: leadInclude,
      });
      if (!lead) return jsonError("Lead not found", 404);
      if (!canAccessLead(user, lead, companyId)) {
        return jsonError("Forbidden", 403);
      }
      return jsonOk({ data: lead });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params, companySlug }) => {
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

      const body = updateLeadSchema.parse(await req.json());
      const { tagIds, ...data } = body;

      const lead = await prisma.lead.update({
        where: { id: params.id },
        data: {
          ...data,
          email: data.email === "" ? null : data.email,
          lastContactDate:
            data.lastContactDate !== undefined
              ? parseDate(data.lastContactDate)
              : undefined,
          nextFollowUpDate:
            data.nextFollowUpDate !== undefined
              ? parseDate(data.nextFollowUpDate)
              : undefined,
        },
        include: leadInclude,
      });

      if (tagIds) {
        await prisma.leadTagAssignment.deleteMany({ where: { leadId: params.id } });
        if (tagIds.length) {
          await prisma.leadTagAssignment.createMany({
            data: tagIds.map((tagId) => ({ leadId: params.id, tagId })),
          });
        }
      }

      if (data.status && data.status !== existing.status) {
        await logLeadActivity({
          leadId: lead.id,
          userId: user.id,
          type: "status.changed",
          description: `Status changed from ${STATUS_LABELS[existing.status] ?? existing.status} to ${STATUS_LABELS[data.status] ?? data.status}`,
          metadata: { from: existing.status, to: data.status },
        });
        if (data.status === "WON" && existing.assignedToId) {
          await createNotification({
            userId: existing.assignedToId,
            companyId,
            type: "DEAL_WON",
            title: "Lead won!",
            body: `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
            link: `/app/${companySlug}/leads/${lead.id}`,
          });
        }
      }

      if (
        data.assignedToId !== undefined &&
        data.assignedToId !== existing.assignedToId &&
        data.assignedToId
      ) {
        await logLeadActivity({
          leadId: lead.id,
          userId: user.id,
          type: "lead.assigned",
          description: "Lead reassigned",
          metadata: { assignedToId: data.assignedToId },
        });
        await notifyLeadAssigned({
          assigneeId: data.assignedToId,
          companyId,
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
          tenantSlug: companySlug,
        });
      }

      return jsonOk({ data: lead });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "leads.lead.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.lead.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Lead not found", 404);
      if (!canAccessLead(user, existing, companyId)) {
        return jsonError("Forbidden", 403);
      }

      await prisma.lead.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
