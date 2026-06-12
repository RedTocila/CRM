/**
 * Link .env to Supabase Postgres and push Prisma schema.
 *
 * Option A — password + project ref + region:
 *   npx tsx scripts/link-supabase.ts <password> <project-ref> <aws-region>
 *
 * Option B — paste pooler URI from Supabase Connect (recommended):
 *   npx tsx scripts/link-supabase.ts --uri "<DATABASE_URL from Supabase>"
 *
 * Supabase Dashboard → your project → Connect → ORM → Prisma
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { buildSupabaseDatabaseUrls } from "../src/lib/supabase/connection";

const envPath = resolve(process.cwd(), ".env");
let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

function upsertEnv(key: string, value: string) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content += `\n${line}`;
  }
}

function parsePoolerUri(uri: string): {
  databaseUrl: string;
  directUrl: string;
  projectRef: string;
} {
  const url = new URL(uri);
  const projectRef = url.username.replace(/^postgres\./, "");
  const password = decodeURIComponent(url.password);

  const regionMatch = url.hostname.match(/^aws-0-([^.]+)/);
  const region = regionMatch?.[1] ?? "us-east-1";

  const { databaseUrl, directUrl } = buildSupabaseDatabaseUrls(password, {
    projectRef,
    region,
  });

  return { databaseUrl, directUrl, projectRef };
}

const args = process.argv.slice(2);

let databaseUrl: string;
let directUrl: string;
let projectRef: string;

if (args[0] === "--uri" && args[1]) {
  const parsed = parsePoolerUri(args[1]);
  databaseUrl = parsed.databaseUrl;
  directUrl = parsed.directUrl;
  projectRef = parsed.projectRef;
} else {
  const password = args[0];
  projectRef = args[1] ?? "";
  const region = args[2] ?? "us-east-1";

  if (!password || !projectRef) {
    console.error(`
Link this CRM to Supabase Postgres.

Option A (recommended) — paste URI from Supabase Connect → Prisma:
  npm run supabase:link -- --uri "postgresql://postgres.xxx:password@aws-0-....pooler.supabase.com:6543/postgres?pgbouncer=true"

Option B — password + project ref + AWS region:
  npm run supabase:link -- <password> <project-ref> <region>

Project ref is in your dashboard URL:
  https://supabase.com/dashboard/project/<project-ref>
`);
    process.exit(1);
  }

  const urls = buildSupabaseDatabaseUrls(password, { projectRef, region });
  databaseUrl = urls.databaseUrl;
  directUrl = urls.directUrl;
}

const projectUrl = `https://${projectRef}.supabase.co`;

upsertEnv("DATABASE_URL", databaseUrl);
upsertEnv("DIRECT_URL", directUrl);
upsertEnv("NEXT_PUBLIC_SUPABASE_URL", projectUrl);
upsertEnv("SUPABASE_PROJECT_REF", projectRef);

if (!/AUTH_SECRET=/.test(content) && !/NEXTAUTH_SECRET=/.test(content)) {
  const secret = randomBytes(32).toString("base64");
  upsertEnv("AUTH_SECRET", secret);
  upsertEnv("NEXTAUTH_SECRET", secret);
}

if (!/NEXTAUTH_URL=/.test(content)) {
  upsertEnv("NEXTAUTH_URL", "http://localhost:3000");
}

if (!/NEXT_PUBLIC_APP_URL=/.test(content)) {
  upsertEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
}

writeFileSync(envPath, content.trim() + "\n");

console.log("✓ Updated .env");
console.log(`  Project: ${projectUrl}`);
console.log("\n→ Pushing Prisma schema...");

try {
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl },
  });
  console.log("\n→ Seeding...");
  execSync("npm run db:seed", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl },
  });
  console.log("\n✓ Supabase linked. Run: npm run dev");
} catch {
  console.error(`
✗ Could not reach Supabase. Check:
  1. Project is fully provisioned (green status in dashboard)
  2. Database password is correct
  3. Region / connection string matches Supabase → Connect → Prisma

Copy the exact URI from Supabase and run:
  npm run supabase:link -- --uri "<paste-uri-here>"
`);
  process.exit(1);
}
