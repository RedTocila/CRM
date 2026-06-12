import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { emitEvent } from "@/lib/events/emitter";
import { leadListWhere } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { notifyLeadAssigned, createNotification } from "@/lib/leads/notifications";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
} from "@/lib/leads/constants";
import type { Prisma } from "@prisma/client";

const createLeadSchema = z.object({
  firstName: z.string().min(1),
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

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q")?.trim();
      const status = searchParams.get("status");
      const source = searchParams.get("source");
      const priority = searchParams.get("priority");
      const assignedToId = searchParams.get("assignedToId");
      const agentId = searchParams.get("agentId");
      const assigned = searchParams.get("assigned");
      const country = searchParams.get("country");
      const tagId = searchParams.get("tagId");
      const from = searchParams.get("from");
      const to = searchParams.get("to");

      const where: Prisma.LeadWhereInput = {
        ...leadListWhere(user, companyId, agentId ?? assignedToId),
        ...(status ? { status: status as never } : {}),
        ...(source ? { source: source as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(assignedToId && !agentId ? { assignedToId } : {}),
        ...(assigned === "unassigned" ? { assignedToId: null } : {}),
        ...(assigned === "assigned" ? { assignedToId: { not: null } } : {}),
        ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(tagId ? { tags: { some: { tagId } } } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
                { company: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const leads = await prisma.lead.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
        },
      });

      return jsonOk({ data: leads });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const POST = withApi(
  async (req, { companyId, user, companySlug }) => {
    const denied = requirePerm(user, "leads.lead.create");
    if (denied) return denied;
    try {
      const body = createLeadSchema.parse(await req.json());
      const { tagIds, ...data } = body;

      // Leads land in admin inbox unless an admin explicitly assigns on create
      const assignedToId =
        data.assignedToId &&
        (user.isSuperAdmin || ["owner", "admin", "manager"].includes(user.roleSlug ?? ""))
          ? data.assignedToId
          : null;

      const lead = await prisma.lead.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email === "" ? null : data.email,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          company: data.company,
          title: data.title,
          website: data.website,
          industry: data.industry,
          country: data.country,
          city: data.city,
          status: data.status,
          source: data.source,
          priority: data.priority,
          assignedToId,
          lastContactDate: parseDate(data.lastContactDate ?? undefined),
          nextFollowUpDate: parseDate(data.nextFollowUpDate ?? undefined),
          leadValue: data.leadValue,
          expectedRevenue: data.expectedRevenue,
          conversionProbability: data.conversionProbability,
          score: data.score,
          companyId,
          createdById: user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
        },
      });

      if (tagIds?.length) {
        await prisma.leadTagAssignment.createMany({
          data: tagIds.map((tagId) => ({ leadId: lead.id, tagId })),
          skipDuplicates: true,
        });
      }

      await logLeadActivity({
        leadId: lead.id,
        userId: user.id,
        type: "lead.created",
        description: "Lead created",
      });

      const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();

      if (assignedToId && assignedToId !== user.id) {
        await notifyLeadAssigned({
          assigneeId: assignedToId,
          companyId,
          leadId: lead.id,
          leadName,
          tenantSlug: companySlug,
        });
      } else if (!assignedToId) {
        const admins = await prisma.companyMember.findMany({
          where: {
            companyId,
            role: { slug: { in: ["owner", "admin", "manager"] } },
          },
          select: { userId: true },
        });
        for (const admin of admins) {
          if (admin.userId === user.id) continue;
          await createNotification({
            userId: admin.userId,
            companyId,
            type: "LEAD_UPDATED",
            title: "New lead in inbox",
            body: `${leadName} — assign to an agent`,
            link: `/app/${companySlug}/leads/${lead.id}`,
            metadata: { leadId: lead.id },
          });
        }
      }

      await emitEvent("lead.created", {
        leadId: lead.id,
        companyId,
        userId: user.id,
      });

      return jsonOk({ data: lead }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads", checkLimit: "leads" }
);
