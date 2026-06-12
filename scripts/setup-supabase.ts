/**
 * Provision Supabase Storage bucket and verify API connectivity.
 * Run after setting NEXT_PUBLIC_SUPABASE_* and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import "dotenv/config";
import { ensureDocumentsBucket, checkSupabaseConnection, CRM_DOCUMENTS_BUCKET } from "../src/lib/supabase/storage";
import { getSupabaseProjectUrl } from "../src/lib/supabase/connection";

async function main() {
  const url = getSupabaseProjectUrl();
  if (!url) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL in .env");
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  console.log(`→ Supabase project: ${url}`);
  console.log(`→ Ensuring storage bucket "${CRM_DOCUMENTS_BUCKET}"...`);
  await ensureDocumentsBucket();

  const status = await checkSupabaseConnection();
  if (!status.ok) {
    console.error("✗ Storage check failed:", status.error);
    process.exit(1);
  }

  console.log("✓ Storage bucket ready");
  console.log("✓ Supabase integration OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
