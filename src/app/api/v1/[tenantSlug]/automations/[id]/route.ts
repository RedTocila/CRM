import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  trigger: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "settings.automations.manage_settings");
    if (denied) return denied;
    try {
      const automation = await prisma.automation.findFirst({
        where: { id: params.id, companyId },
        include: { runs: { take: 10, orderBy: { startedAt: "desc" } } },
      });
      if (!automation) return jsonError("Automation not found", 404);
      return jsonOk({ data: automation });
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "settings.automations.manage_settings");
    if (denied) return denied;
    try {
      const existing = await prisma.automation.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Automation not found", 404);

      const body = updateAutomationSchema.parse(await req.json());
      const automation = await prisma.automation.update({
        where: { id: params.id },
        data: {
          ...body,
          trigger: body.trigger as Prisma.InputJsonValue | undefined,
          conditions: body.conditions as Prisma.InputJsonValue | undefined,
          actions: body.actions as Prisma.InputJsonValue | undefined,
        },
      });
      return jsonOk({ data: automation });
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "settings.automations.manage_settings");
    if (denied) return denied;
    try {
      const existing = await prisma.automation.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Automation not found", 404);

      await prisma.automation.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);
