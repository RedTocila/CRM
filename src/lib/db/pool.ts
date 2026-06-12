import { Pool, type PoolConfig } from "pg";

function isSupabaseUrl(connectionString: string): boolean {
  return connectionString.includes("supabase.com") || connectionString.includes("supabase.co");
}

/** Shared pg Pool for Prisma adapter — handles Supabase pooler SSL on local dev. */
export function createPgPool(connectionString: string): Pool {
  let url = connectionString;

  if (isSupabaseUrl(connectionString)) {
    // pg v8 treats sslmode=require as verify-full; libpq compat + explicit ssl fixes Supabase pooler.
    const parsed = new URL(connectionString.replace(/^postgresql:/, "postgres:"));
    parsed.searchParams.set("uselibpqcompat", "true");
    parsed.searchParams.set("sslmode", "require");
    url = parsed.toString().replace(/^postgres:/, "postgresql:");
  }

  const config: PoolConfig = {
    connectionString: url,
    ...(isSupabaseUrl(connectionString)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };

  return new Pool(config);
}
