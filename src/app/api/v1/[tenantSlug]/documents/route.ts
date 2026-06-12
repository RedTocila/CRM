import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createDocumentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  folderId: z.string().optional(),
  size: z.number().int().optional(),
  mimeType: z.string().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "documents.document.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const folderId = searchParams.get("folderId");
      const documents = await prisma.document.findMany({
        where: {
          companyId,
          ...(folderId ? { folderId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: documents });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "documents" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "documents.document.create");
    if (denied) return denied;
    try {
      const body = createDocumentSchema.parse(await req.json());
      const document = await prisma.document.create({
        data: {
          ...body,
          companyId,
          uploadedById: user.id,
        },
      });
      return jsonOk({ data: document }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "documents" }
);
