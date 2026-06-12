import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createDealSchema = z.object({
  title: z.string().min(1),
  value: z.coerce.number().optional(),
  currency: z.string().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  contactId: z.string().optional(),
  expectedCloseDate: z.coerce.date().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "deals.deal.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const stageId = searchParams.get("stageId");
      const deals = await prisma.deal.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(status ? { status: status as never } : {}),
          ...(stageId ? { stageId } : {}),
        },
        include: { stage: true, contact: true },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: deals });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "deals.deal.create");
    if (denied) return denied;
    try {
      const body = createDealSchema.parse(await req.json());
      const deal = await prisma.deal.create({
        data: {
          title: body.title,
          value: body.value ?? 0,
          currency: body.currency,
          status: body.status,
          pipelineId: body.pipelineId,
          stageId: body.stageId,
          contactId: body.contactId,
          expectedCloseDate: body.expectedCloseDate,
          companyId,
          createdById: user.id,
        },
        include: { stage: true, contact: true },
      });
      return jsonOk({ data: deal }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "deals" }
);
