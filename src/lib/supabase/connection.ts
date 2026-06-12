export function getSupabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) return match[1];
  return process.env.SUPABASE_PROJECT_REF ?? "";
}

export function getSupabaseProjectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (getSupabaseProjectRef()
      ? `https://${getSupabaseProjectRef()}.supabase.co`
      : "")
  );
}

export function buildSupabaseDatabaseUrls(
  password: string,
  options: { projectRef: string; region: string }
): { databaseUrl: string; directUrl: string } {
  const { projectRef, region } = options;
  const encoded = encodeURIComponent(password);

  const databaseUrl =
    `postgresql://postgres.${projectRef}:${encoded}` +
    `@aws-0-${region}.pooler.supabase.com:6543/postgres` +
    `?pgbouncer=true&sslmode=require`;

  const directUrl =
    `postgresql://postgres.${projectRef}:${encoded}` +
    `@aws-0-${region}.pooler.supabase.com:5432/postgres` +
    `?sslmode=require`;

  return { databaseUrl, directUrl };
}
