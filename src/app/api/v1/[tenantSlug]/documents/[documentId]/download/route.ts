import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { createDocumentSignedUrl } from "@/lib/supabase/storage";

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "documents.document.read");
    if (denied) return denied;

    try {
      const documentId = params.documentId;
      const document = await prisma.document.findFirst({
        where: { id: documentId, companyId },
      });

      if (!document) {
        return handleApiError(new Error("Document not found"));
      }

      const signedUrl = await createDocumentSignedUrl(document.url);
      return NextResponse.redirect(signedUrl, 302);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "documents" }
);
