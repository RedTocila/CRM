import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createEstimateSchema = z.object({
  number: z.string().min(1),
  contactName: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  subtotal: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  validUntil: z.coerce.date().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "estimates.estimate.read");
    if (denied) return denied;
    try {
      const estimates = await prisma.estimate.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: estimates });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "estimates" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "estimates.estimate.create");
    if (denied) return denied;
    try {
      const body = createEstimateSchema.parse(await req.json());
      const estimate = await prisma.estimate.create({
        data: {
          ...body,
          subtotal: body.subtotal ?? 0,
          tax: body.tax ?? 0,
          total: body.total ?? 0,
          companyId,
        },
      });
      return jsonOk({ data: estimate }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "estimates" }
);
