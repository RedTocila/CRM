import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fields: z.union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "forms.form.read");
    if (denied) return denied;
    try {
      const form = await prisma.form.findFirst({
        where: { id: params.id, companyId },
        include: { submissions: { take: 20, orderBy: { createdAt: "desc" } } },
      });
      if (!form) return jsonError("Form not found", 404);
      return jsonOk({ data: form });
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
      const existing = await prisma.form.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Form not found", 404);

      const body = updateFormSchema.parse(await req.json());
      const form = await prisma.form.update({
        where: { id: params.id },
        data: {
          name: body.name,
          description: body.description,
          isActive: body.isActive,
          fields: body.fields as Prisma.InputJsonValue | undefined,
          settings: body.settings as Prisma.InputJsonValue | undefined,
        },
      });
      return jsonOk({ data: form });
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
      const existing = await prisma.form.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Form not found", 404);

      await prisma.form.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);
