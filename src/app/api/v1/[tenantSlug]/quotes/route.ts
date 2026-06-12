import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createQuoteSchema = z.object({
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
    const denied = requirePerm(user, "quotes.quote.read");
    if (denied) return denied;
    try {
      const quotes = await prisma.quote.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: quotes });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "quotes" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "quotes.quote.create");
    if (denied) return denied;
    try {
      const body = createQuoteSchema.parse(await req.json());
      const quote = await prisma.quote.create({
        data: {
          ...body,
          subtotal: body.subtotal ?? 0,
          tax: body.tax ?? 0,
          total: body.total ?? 0,
          companyId,
        },
      });
      return jsonOk({ data: quote }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "quotes" }
);
