import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { emitEvent } from "@/lib/events/emitter";

const moveDealSchema = z.object({
  stageId: z.string().min(1),
  pipelineId: z.string().optional(),
});

export const POST = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "deals.deal.update");
    if (denied) return denied;
    try {
      const existing = await prisma.deal.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Deal not found", 404);

      const body = moveDealSchema.parse(await req.json());
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: body.stageId,
          pipeline: { companyId },
        },
      });
      if (!stage) return jsonError("Stage not found", 404);

      const deal = await prisma.deal.update({
        where: { id: params.id },
        data: {
          stageId: body.stageId,
          pipelineId: body.pipelineId ?? stage.pipelineId,
        },
        include: { stage: true, pipeline: true },
      });

      await emitEvent("deal.moved", {
        dealId: deal.id,
        companyId,
        userId: user.id,
        fromStageId: existing.stageId,
        toStageId: body.stageId,
      });

      return jsonOk({ data: deal });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);
