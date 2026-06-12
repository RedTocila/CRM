import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  published: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "forms.form.read");
    if (denied) return denied;
    try {
      const page = await prisma.landingPage.findFirst({
        where: { id: params.id, companyId },
      });
      if (!page) return jsonError("Not found", 404);
      return jsonOk({ data: page });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "forms.form.update");
    if (denied) return denied;
    try {
      const body = patchSchema.parse(await req.json());
      const page = await prisma.landingPage.update({
        where: { id: params.id },
        data: {
          ...body,
          content: body.content as Prisma.InputJsonValue | undefined,
          settings: body.settings as Prisma.InputJsonValue | undefined,
        },
      });
      return jsonOk({ data: page });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "forms.form.delete");
    if (denied) return denied;
    try {
      await prisma.landingPage.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);
