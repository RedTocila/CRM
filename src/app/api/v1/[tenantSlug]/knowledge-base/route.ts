import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  categoryId: z.string().optional(),
  published: z.boolean().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "knowledge_base.article.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const published = searchParams.get("published");
      const articles = await prisma.kBArticle.findMany({
        where: {
          companyId,
          ...(published !== null ? { published: published === "true" } : {}),
        },
        include: { category: true },
        orderBy: { updatedAt: "desc" },
      });
      return jsonOk({ data: articles });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "knowledge_base" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "knowledge_base.article.create");
    if (denied) return denied;
    try {
      const body = createArticleSchema.parse(await req.json());
      const article = await prisma.kBArticle.create({
        data: { ...body, companyId },
        include: { category: true },
      });
      return jsonOk({ data: article }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "knowledge_base" }
);
