import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const tags = await prisma.tag.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      });
      return jsonOk({ data: tags });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.create");
    if (denied) return denied;
    try {
      const body = tagSchema.parse(await req.json());
      const tag = await prisma.tag.upsert({
        where: { companyId_name: { companyId, name: body.name } },
        create: { companyId, name: body.name, color: body.color ?? "#6366f1" },
        update: { color: body.color },
      });
      return jsonOk({ data: tag }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
