import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

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
    try {
      const body = createPipelineSchema.parse(await req.json());
      const { stages, ...pipelineData } = body;

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
          stages: stages
            ? {
                create: stages.map((s) => ({
                  name: s.name,
                  order: s.order,
                  probability: s.probability ?? 0,
                })),
              }
            : undefined,
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
