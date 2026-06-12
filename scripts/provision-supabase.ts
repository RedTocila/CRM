/**
 * Full Supabase provisioning: schema (Prisma), seed data, storage bucket.
 * Run: npm run supabase:provision
 */
import { execSync } from "node:child_process";
import "dotenv/config";
import { createPgPool } from "../src/lib/db/pool";
import {
  checkSupabaseConnection,
  CRM_DOCUMENTS_BUCKET,
  ensureDocumentsBucket,
} from "../src/lib/supabase/storage";
import { getSupabaseProjectUrl } from "../src/lib/supabase/connection";

async function verifyDatabase() {
  const pool = createPgPool(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
  const tables = await pool.query(
    `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
  );
  const counts = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Company") AS companies,
      (SELECT count(*)::int FROM "Lead") AS leads,
      (SELECT count(*)::int FROM "ModuleDefinition") AS modules
  `);
  await pool.end();
  return { tables: tables.rows[0].n as number, counts: counts.rows[0] };
}

async function main() {
  const url = getSupabaseProjectUrl();
  if (!url || !process.env.DIRECT_URL) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, and DIRECT_URL in .env");
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  console.log(`\n▶ Supabase project: ${url}\n`);

  console.log("1/3 Pushing Prisma schema (all tables)...");
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL },
  });

  console.log("\n2/3 Seeding demo data...");
  execSync("npm run db:seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL },
  });

  console.log(`\n3/3 Creating storage bucket "${CRM_DOCUMENTS_BUCKET}"...`);
  await ensureDocumentsBucket();
  const storage = await checkSupabaseConnection();
  if (!storage.ok) {
    console.error("✗ Storage failed:", storage.error);
    process.exit(1);
  }

  const db = await verifyDatabase();
  console.log("\n✓ Supabase provisioned successfully\n");
  console.log(`  Tables in public schema: ${db.tables}`);
  console.log(`  Users: ${db.counts.users} | Companies: ${db.counts.companies} | Leads: ${db.counts.leads} | Modules: ${db.counts.modules}`);
  console.log(`  Storage bucket: ${CRM_DOCUMENTS_BUCKET} (private)`);
  console.log("\n  Demo login: demo@acme.local / admin123 → /app/acme\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
