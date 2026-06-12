import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "calendar.event.read");
    if (denied) return denied;
    try {
      const event = await prisma.calendarEvent.findFirst({
        where: { id: params.id, companyId },
        include: { attendees: true, reminders: true },
      });
      if (!event) return jsonError("Event not found", 404);
      return jsonOk({ data: event });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "calendar" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "calendar.event.update");
    if (denied) return denied;
    try {
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Event not found", 404);

      const body = updateEventSchema.parse(await req.json());
      const event = await prisma.calendarEvent.update({
        where: { id: params.id },
        data: body,
      });
      return jsonOk({ data: event });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "calendar" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "calendar.event.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.calendarEvent.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Event not found", 404);

      await prisma.calendarEvent.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "calendar" }
);
