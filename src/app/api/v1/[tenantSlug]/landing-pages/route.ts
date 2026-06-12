import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  content: z
    .object({
      blocks: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .passthrough()
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  published: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "forms.form.read");
    if (denied) return denied;
    try {
      const pages = await prisma.landingPage.findMany({
        where: { companyId },
        orderBy: { updatedAt: "desc" },
      });
      return jsonOk({ data: pages });
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
      const body = createSchema.parse(await req.json());
      const slug =
        (body.slug ? slugify(body.slug) : slugify(body.title)) ||
        `page-${Date.now()}`;

      const page = await prisma.landingPage.create({
        data: {
          companyId,
          title: body.title,
          slug,
          content: (body.content ?? { blocks: [] }) as Prisma.InputJsonValue,
          published: body.published ?? false,
          ...(body.settings ? { settings: body.settings as Prisma.InputJsonValue } : {}),
        },
      });
      return jsonOk({ data: page }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "forms" }
);
