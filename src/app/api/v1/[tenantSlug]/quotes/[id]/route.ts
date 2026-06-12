import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateQuoteSchema = z.object({
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
    const denied = requirePerm(user, "quotes.quote.read");
    if (denied) return denied;
    try {
      const quote = await prisma.quote.findFirst({
        where: { id: params.id, companyId },
      });
      if (!quote) return jsonError("Quote not found", 404);
      return jsonOk({ data: quote });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "quotes" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "quotes.quote.update");
    if (denied) return denied;
    try {
      const existing = await prisma.quote.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Quote not found", 404);

      const body = updateQuoteSchema.parse(await req.json());
      const quote = await prisma.quote.update({
        where: { id: params.id },
        data: body,
      });
      return jsonOk({ data: quote });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "quotes" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "quotes.quote.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.quote.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Quote not found", 404);

      await prisma.quote.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "quotes" }
);
