import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import {
  assertAllowedUpload,
  documentStoragePath,
  uploadDocumentFile,
} from "@/lib/supabase/storage";

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "documents.document.create");
    if (denied) return denied;

    try {
      const formData = await req.formData();
      const file = formData.get("file");
      const folderId = formData.get("folderId");

      if (!(file instanceof File)) {
        return handleApiError(new Error("No file provided"));
      }

      assertAllowedUpload({
        size: file.size,
        type: file.type,
        name: file.name,
      });

      const documentId = randomUUID();
      const storagePath = documentStoragePath(companyId, documentId, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());

      await uploadDocumentFile(storagePath, buffer, file.type || "application/octet-stream");

      const document = await prisma.document.create({
        data: {
          id: documentId,
          companyId,
          folderId: typeof folderId === "string" && folderId ? folderId : undefined,
          name: file.name,
          url: storagePath,
          size: file.size,
          mimeType: file.type || null,
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
