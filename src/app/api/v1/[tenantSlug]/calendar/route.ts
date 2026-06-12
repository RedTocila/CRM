import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  allDay: z.boolean().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "calendar.event.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const events = await prisma.calendarEvent.findMany({
        where: {
          companyId,
          ...(from || to
            ? {
                startAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
        include: { attendees: true },
        orderBy: { startAt: "asc" },
      });
      return jsonOk({ data: events });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "calendar" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "calendar.event.create");
    if (denied) return denied;
    try {
      const body = createEventSchema.parse(await req.json());
      const event = await prisma.calendarEvent.create({
        data: {
          ...body,
          companyId,
          createdById: user.id,
        },
      });
      return jsonOk({ data: event }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "calendar" }
);
