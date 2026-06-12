import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const CRM_DOCUMENTS_BUCKET = "crm-documents";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/",
  "application/pdf",
  "application/msword",
  "application/vnd.",
  "application/json",
  "application/zip",
];

export function documentStoragePath(companyId: string, documentId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${companyId}/${documentId}/${safeName}`;
}

export function parseDocumentStoragePath(storagePath: string): {
  companyId: string;
  documentId: string;
  fileName: string;
} | null {
  const parts = storagePath.split("/");
  if (parts.length < 3) return null;
  const [companyId, documentId, ...rest] = parts;
  return { companyId, documentId, fileName: rest.join("/") };
}

export function assertAllowedUpload(file: { size: number; type: string; name: string }) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds ${MAX_FILE_BYTES / 1024 / 1024} MB limit`);
  }
  const mime = file.type || "application/octet-stream";
  const allowed =
    ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)) ||
    mime === "application/octet-stream";
  if (!allowed) {
    throw new Error(`File type not allowed: ${mime}`);
  }
}

export async function ensureDocumentsBucket() {
  const supabase = createSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === CRM_DOCUMENTS_BUCKET)) return;

  const { error } = await supabase.storage.createBucket(CRM_DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
  });
  if (error && !error.message.includes("already exists")) {
    throw error;
  }
}

export async function uploadDocumentFile(
  storagePath: string,
  file: Buffer,
  contentType: string
) {
  await ensureDocumentsBucket();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(CRM_DOCUMENTS_BUCKET).upload(storagePath, file, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
}

export async function deleteDocumentFile(storagePath: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.storage.from(CRM_DOCUMENTS_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function createDocumentSignedUrl(storagePath: string, expiresInSeconds = 3600) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(CRM_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  storage: boolean;
  bucket: boolean;
  error?: string;
}> {
  try {
    const supabase = createSupabaseAdmin();
    const { error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      return { ok: false, storage: false, bucket: false, error: storageError.message };
    }
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.some((b) => b.name === CRM_DOCUMENTS_BUCKET) ?? false;
    return { ok: true, storage: true, bucket };
  } catch (e) {
    return {
      ok: false,
      storage: false,
      bucket: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
