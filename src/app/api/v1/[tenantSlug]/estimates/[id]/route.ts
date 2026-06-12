import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateEstimateSchema = z.object({
  number: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  subtotal: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  validUntil: z.coerce.date().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "estimates.estimate.read");
    if (denied) return denied;
    try {
      const estimate = await prisma.estimate.findFirst({
        where: { id: params.id, companyId },
      });
      if (!estimate) return jsonError("Estimate not found", 404);
      return jsonOk({ data: estimate });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "estimates" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "estimates.estimate.update");
    if (denied) return denied;
    try {
      const existing = await prisma.estimate.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Estimate not found", 404);

      const body = updateEstimateSchema.parse(await req.json());
      const estimate = await prisma.estimate.update({
        where: { id: params.id },
        data: body,
      });
      return jsonOk({ data: estimate });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "estimates" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "estimates.estimate.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.estimate.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Estimate not found", 404);

      await prisma.estimate.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "estimates" }
);
