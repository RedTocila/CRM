import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.coerce.number().optional(),
  currency: z.string().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "deals.deal.read");
    if (denied) return denied;
    try {
      const deal = await prisma.deal.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
        include: { stage: true, contact: true, pipeline: true },
      });
      if (!deal) return jsonError("Deal not found", 404);
      return jsonOk({ data: deal });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "deals.deal.update");
    if (denied) return denied;
    try {
      const existing = await prisma.deal.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Deal not found", 404);

      const body = updateDealSchema.parse(await req.json());
      const deal = await prisma.deal.update({
        where: { id: params.id },
        data: body,
        include: { stage: true, contact: true },
      });
      return jsonOk({ data: deal });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "deals.deal.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.deal.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Deal not found", 404);

      await prisma.deal.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);
