import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { emitEvent } from "@/lib/events/emitter";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  relatedType: z.string().optional().nullable(),
  relatedId: z.string().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tasks.task.read");
    if (denied) return denied;
    try {
      const task = await prisma.task.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!task) return jsonError("Task not found", 404);
      return jsonOk({ data: task });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tasks" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tasks.task.update");
    if (denied) return denied;
    try {
      const existing = await prisma.task.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Task not found", 404);

      const body = updateTaskSchema.parse(await req.json());
      const task = await prisma.task.update({
        where: { id: params.id },
        data: body,
      });

      if (body.status === "DONE" && existing.status !== "DONE") {
        await emitEvent("task.completed", {
          taskId: task.id,
          companyId,
          userId: user.id,
        });
      }

      return jsonOk({ data: task });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tasks" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "tasks.task.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.task.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Task not found", 404);

      await prisma.task.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "tasks" }
);
