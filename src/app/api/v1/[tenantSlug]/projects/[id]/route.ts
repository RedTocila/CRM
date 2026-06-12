import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "projects.project.read");
    if (denied) return denied;
    try {
      const project = await prisma.project.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
        include: { members: true, milestones: true, files: true },
      });
      if (!project) return jsonError("Project not found", 404);
      return jsonOk({ data: project });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "projects" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "projects.project.update");
    if (denied) return denied;
    try {
      const existing = await prisma.project.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Project not found", 404);

      const body = updateProjectSchema.parse(await req.json());
      const project = await prisma.project.update({
        where: { id: params.id },
        data: body,
      });
      return jsonOk({ data: project });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "projects" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "projects.project.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.project.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Project not found", 404);

      await prisma.project.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "projects" }
);
