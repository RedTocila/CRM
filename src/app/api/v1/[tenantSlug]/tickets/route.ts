import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  contactId: z.string().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "tickets.ticket.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const tickets = await prisma.ticket.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(status ? { status: status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: tickets });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tickets" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "tickets.ticket.create");
    if (denied) return denied;
    try {
      const body = createTicketSchema.parse(await req.json());
      const ticket = await prisma.ticket.create({
        data: { ...body, companyId },
      });
      return jsonOk({ data: ticket }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tickets" }
);
