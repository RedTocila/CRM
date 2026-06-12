import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "knowledge_base.article.read");
    if (denied) return denied;
    try {
      const article = await prisma.kBArticle.findFirst({
        where: { id: params.id, companyId },
        include: { category: true },
      });
      if (!article) return jsonError("Article not found", 404);
      return jsonOk({ data: article });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "knowledge_base" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "knowledge_base.article.update");
    if (denied) return denied;
    try {
      const existing = await prisma.kBArticle.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Article not found", 404);

      const body = updateArticleSchema.parse(await req.json());
      const article = await prisma.kBArticle.update({
        where: { id: params.id },
        data: body,
        include: { category: true },
      });
      return jsonOk({ data: article });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "knowledge_base" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "knowledge_base.article.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.kBArticle.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Article not found", 404);

      await prisma.kBArticle.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "knowledge_base" }
);
