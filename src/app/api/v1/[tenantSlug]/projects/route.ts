import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "projects.project.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const projects = await prisma.project.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        include: { members: true, milestones: true },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: projects });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "projects" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "projects.project.create");
    if (denied) return denied;
    try {
      const body = createProjectSchema.parse(await req.json());
      const project = await prisma.project.create({
        data: { ...body, companyId },
      });
      return jsonOk({ data: project }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "projects" }
);
