import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "tasks.task.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const assigneeId = searchParams.get("assigneeId");
      const tasks = await prisma.task.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(status ? { status: status as never } : {}),
          ...(assigneeId ? { assigneeId } : {}),
        },
        orderBy: { dueDate: "asc" },
      });
      return jsonOk({ data: tasks });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tasks" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "tasks.task.create");
    if (denied) return denied;
    try {
      const body = createTaskSchema.parse(await req.json());
      const task = await prisma.task.create({
        data: {
          ...body,
          companyId,
          createdById: user.id,
        },
      });
      return jsonOk({ data: task }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tasks" }
);
