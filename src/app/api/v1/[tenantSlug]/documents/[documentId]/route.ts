import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { deleteDocumentFile } from "@/lib/supabase/storage";

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "documents.document.delete");
    if (denied) return denied;

    try {
      const documentId = params.documentId;
      const document = await prisma.document.findFirst({
        where: { id: documentId, companyId },
      });

      if (!document) {
        return handleApiError(new Error("Document not found"));
      }

      await deleteDocumentFile(document.url);
      await prisma.document.delete({ where: { id: documentId } });

      return jsonOk({ deleted: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "documents" }
);
