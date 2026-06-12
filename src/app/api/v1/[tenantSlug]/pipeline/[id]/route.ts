import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManagePipelines } from "@/lib/pipeline/access";

const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  order: z.number().int(),
  probability: z.number().int().min(0).max(100).optional(),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(stageSchema).optional(),
});

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "pipeline.pipeline.update");
    if (denied) return denied;
    if (!canManagePipelines(user)) {
      return jsonError("Only CRM admins can edit pipelines", 403);
    }

    try {
      const pipelineId = params.id;
      const existing = await prisma.pipeline.findFirst({
        where: { id: pipelineId, companyId },
        include: { stages: true },
      });
      if (!existing) return jsonError("Pipeline not found", 404);

      const body = updatePipelineSchema.parse(await req.json());

      if (body.isDefault) {
        await prisma.pipeline.updateMany({
          where: { companyId, isDefault: true, id: { not: pipelineId } },
          data: { isDefault: false },
        });
      }

      if (body.stages) {
        const incomingIds = new Set(
          body.stages.map((s) => s.id).filter((id): id is string => Boolean(id))
        );

        for (const stage of existing.stages) {
          if (!incomingIds.has(stage.id)) {
            const dealCount = await prisma.deal.count({
              where: { stageId: stage.id },
            });
            if (dealCount > 0) {
              return jsonError(
                `Cannot remove stage "${stage.name}" — ${dealCount} deal(s) are in this stage`,
                400
              );
            }
            await prisma.pipelineStage.delete({ where: { id: stage.id } });
          }
        }

        for (const stage of body.stages) {
          if (stage.id) {
            const owned = existing.stages.some((s) => s.id === stage.id);
            if (!owned) continue;
            await prisma.pipelineStage.update({
              where: { id: stage.id },
              data: {
                name: stage.name,
                order: stage.order,
                probability: stage.probability ?? 0,
              },
            });
          } else {
            await prisma.pipelineStage.create({
              data: {
                pipelineId,
                name: stage.name,
                order: stage.order,
                probability: stage.probability ?? 0,
              },
            });
          }
        }
      }

      const pipeline = await prisma.pipeline.update({
        where: { id: pipelineId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });

      return jsonOk({ data: pipeline });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "pipeline" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "pipeline.pipeline.delete");
    if (denied) return denied;
    if (!canManagePipelines(user)) {
      return jsonError("Only CRM admins can delete pipelines", 403);
    }

    try {
      const pipelineId = params.id;
      const existing = await prisma.pipeline.findFirst({
        where: { id: pipelineId, companyId },
      });
      if (!existing) return jsonError("Pipeline not found", 404);

      const pipelineCount = await prisma.pipeline.count({ where: { companyId } });
      if (pipelineCount <= 1) {
        return jsonError("Cannot delete the only pipeline", 400);
      }

      const dealCount = await prisma.deal.count({ where: { pipelineId } });
      if (dealCount > 0) {
        return jsonError(
          `Cannot delete pipeline — ${dealCount} deal(s) are linked to it`,
          400
        );
      }

      await prisma.pipeline.delete({ where: { id: pipelineId } });

      if (existing.isDefault) {
        const next = await prisma.pipeline.findFirst({
          where: { companyId },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await prisma.pipeline.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }

      return jsonOk({ deleted: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "pipeline" }
);
