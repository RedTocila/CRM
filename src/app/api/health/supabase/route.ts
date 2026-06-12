import { checkSupabaseConnection } from "@/lib/supabase/storage";
import { getSupabaseProjectUrl } from "@/lib/supabase/connection";

export async function GET() {
  const url = getSupabaseProjectUrl();
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDb = Boolean(process.env.DATABASE_URL);

  let storage: Awaited<ReturnType<typeof checkSupabaseConnection>> = {
    ok: false,
    storage: false,
    bucket: false,
    error: "Not checked",
  };
  if (hasService && url) {
    storage = await checkSupabaseConnection();
  }

  const ok = hasDb && hasAnon && hasService && url && storage.ok;

  return Response.json({
    ok,
    projectUrl: url || null,
    database: hasDb,
    anonKey: hasAnon,
    serviceRoleKey: hasService,
    storage,
  });
}
