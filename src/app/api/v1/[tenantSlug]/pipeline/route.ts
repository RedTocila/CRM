import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManagePipelines } from "@/lib/pipeline/access";
import { jsonError } from "@/lib/api/response";

const stageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int(),
  probability: z.number().int().min(0).max(100).optional(),
});

const createPipelineSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  stages: z.array(stageSchema).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "pipeline.pipeline.read");
    if (denied) return denied;
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { companyId },
        include: { stages: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      });
      return jsonOk({ data: pipelines });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "pipeline" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "pipeline.pipeline.create");
    if (denied) return denied;
    if (!canManagePipelines(user)) {
      return jsonError("Only CRM admins can create pipelines", 403);
    }
    try {
      const body = createPipelineSchema.parse(await req.json());
      const { stages, ...pipelineData } = body;

      const defaultStages = stages ?? [
        { name: "New", order: 0, probability: 10 },
        { name: "In Progress", order: 1, probability: 50 },
        { name: "Won", order: 2, probability: 100 },
      ];

      if (pipelineData.isDefault) {
        await prisma.pipeline.updateMany({
          where: { companyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const pipeline = await prisma.pipeline.create({
        data: {
          ...pipelineData,
          companyId,
          stages: {
            create: defaultStages.map((s) => ({
              name: s.name,
              order: s.order,
              probability: s.probability ?? 0,
            })),
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
      return jsonOk({ data: pipeline }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "pipeline" }
);
