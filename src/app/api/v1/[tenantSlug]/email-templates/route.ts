import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const CATEGORIES = [
  "INTRODUCTION",
  "FOLLOW_UP",
  "PROPOSAL",
  "MEETING",
  "THANK_YOU",
  "OBJECTION",
  "CLOSING",
  "CUSTOM",
] as const;

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(CATEGORIES).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.read");
    if (denied) return denied;
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
      return jsonOk({ data: templates });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.create");
    if (denied) return denied;
    try {
      const body = createSchema.parse(await req.json());
      const template = await prisma.emailTemplate.create({
        data: { ...body, companyId },
      });
      return jsonOk({ data: template }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);
