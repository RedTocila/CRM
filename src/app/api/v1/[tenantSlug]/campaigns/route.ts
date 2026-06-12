import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  budget: z.coerce.number().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "marketing.campaign.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const campaigns = await prisma.campaign.findMany({
        where: {
          companyId,
          ...(status ? { status: status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: campaigns });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "marketing" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "marketing.campaign.create");
    if (denied) return denied;
    try {
      const body = createCampaignSchema.parse(await req.json());
      const campaign = await prisma.campaign.create({
        data: { ...body, companyId },
      });
      return jsonOk({ data: campaign }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "marketing" }
);
