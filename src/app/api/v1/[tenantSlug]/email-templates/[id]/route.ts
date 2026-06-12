import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.read");
    if (denied) return denied;
    try {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: params.id, companyId },
      });
      if (!template) return jsonError("Not found", 404);
      return jsonOk({ data: template });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.update");
    if (denied) return denied;
    try {
      const body = patchSchema.parse(await req.json());
      const template = await prisma.emailTemplate.update({
        where: { id: params.id },
        data: body,
      });
      return jsonOk({ data: template });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);
