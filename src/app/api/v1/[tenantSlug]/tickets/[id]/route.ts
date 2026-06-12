import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateTicketSchema = z.object({
  subject: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tickets.ticket.read");
    if (denied) return denied;
    try {
      const ticket = await prisma.ticket.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
        include: { messages: true, sla: true },
      });
      if (!ticket) return jsonError("Ticket not found", 404);
      return jsonOk({ data: ticket });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tickets" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tickets.ticket.update");
    if (denied) return denied;
    try {
      const existing = await prisma.ticket.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Ticket not found", 404);

      const body = updateTicketSchema.parse(await req.json());
      const resolvedAt =
        body.status === "RESOLVED" || body.status === "CLOSED"
          ? new Date()
          : undefined;

      const ticket = await prisma.ticket.update({
        where: { id: params.id },
        data: { ...body, ...(resolvedAt ? { resolvedAt } : {}) },
      });
      return jsonOk({ data: ticket });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tickets" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tickets.ticket.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.ticket.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Ticket not found", 404);

      await prisma.ticket.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tickets" }
);
