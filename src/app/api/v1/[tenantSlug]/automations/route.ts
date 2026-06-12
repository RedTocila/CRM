import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  trigger: z.record(z.string(), z.unknown()),
  conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.automations.manage_settings");
    if (denied) return denied;
    try {
      const automations = await prisma.automation.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: automations });
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.automations.manage_settings");
    if (denied) return denied;
    try {
      const body = createAutomationSchema.parse(await req.json());
      const automation = await prisma.automation.create({
        data: {
          name: body.name,
          description: body.description,
          isActive: body.isActive,
          trigger: body.trigger as Prisma.InputJsonValue,
          conditions: (body.conditions ?? []) as Prisma.InputJsonValue,
          actions: (body.actions ?? []) as Prisma.InputJsonValue,
          companyId,
          createdById: user.id,
        },
      });
      return jsonOk({ data: automation }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);
