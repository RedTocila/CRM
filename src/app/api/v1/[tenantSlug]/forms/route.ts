import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { slugify } from "@/lib/utils";

const createFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().optional(),
  fields: z
    .union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())])
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "forms.form.read");
    if (denied) return denied;
    try {
      const forms = await prisma.form.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: forms });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "forms.form.create");
    if (denied) return denied;
    try {
      const body = createFormSchema.parse(await req.json());
      const slug =
        body.slug?.trim() ||
        slugify(body.name) ||
        `form-${Date.now()}`;

      const form = await prisma.form.create({
        data: {
          name: body.name,
          slug,
          fields: (body.fields ?? []) as Prisma.InputJsonValue,
          isActive: body.isActive ?? true,
          companyId,
          ...(body.description ? { description: body.description } : {}),
          ...(body.settings ? { settings: body.settings as Prisma.InputJsonValue } : {}),
        },
      });
      return jsonOk({ data: form }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);
