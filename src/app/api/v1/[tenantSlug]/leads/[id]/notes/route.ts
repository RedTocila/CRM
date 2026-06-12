import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canAccessLead } from "@/lib/leads/access";
import { logLeadActivity } from "@/lib/leads/activity";
import { createNotification } from "@/lib/leads/notifications";

const noteSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z
    .array(z.object({ name: z.string(), url: z.string() }))
    .optional(),
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

      const body = noteSchema.parse(await req.json());
      const note = await prisma.leadNote.create({
        data: {
          leadId: params.id,
          userId: user.id,
          content: body.content,
          isInternal: body.isInternal ?? false,
          mentions: body.mentions ?? undefined,
          attachments: body.attachments ?? undefined,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      await logLeadActivity({
        leadId: params.id,
        userId: user.id,
        type: body.isInternal ? "note.internal" : "comment.added",
        description: body.isInternal ? "Internal note added" : "Comment added",
      });

      for (const mentionId of body.mentions ?? []) {
        if (mentionId === user.id) continue;
        await createNotification({
          userId: mentionId,
          companyId,
          type: "MENTION",
          title: "You were mentioned",
          body: body.content.slice(0, 120),
          link: `/app/${companySlug}/leads/${params.id}`,
        });
      }

      return jsonOk({ data: note }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

const patchSchema = z.object({
  noteId: z.string(),
  content: z.string().min(1),
});

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

      const body = patchSchema.parse(await req.json());
      const existing = await prisma.leadNote.findFirst({
        where: { id: body.noteId, leadId: params.id },
      });
      if (!existing) return jsonError("Note not found", 404);
      if (existing.userId !== user.id && !user.isSuperAdmin && user.roleSlug !== "admin" && user.roleSlug !== "owner") {
        return jsonError("Can only edit your own notes", 403);
      }

      const history = Array.isArray(existing.editHistory)
        ? (existing.editHistory as object[])
        : [];
      history.push({
        content: existing.content,
        editedAt: new Date().toISOString(),
        editedBy: user.id,
      });

      const note = await prisma.leadNote.update({
        where: { id: body.noteId },
        data: {
          content: body.content,
          editHistory: history,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      await logLeadActivity({
        leadId: params.id,
        userId: user.id,
        type: "comment.edited",
        description: "Comment edited",
      });

      return jsonOk({ data: note });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
