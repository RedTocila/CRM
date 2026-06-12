import { prisma } from "@/lib/db";
import type { Company } from "@prisma/client";

export async function resolveTenantBySlug(slug: string): Promise<Company | null> {
  return prisma.company.findFirst({
    where: { slug, status: { in: ["ACTIVE", "SUSPENDED"] } },
  });
}

export async function resolveTenantByDomain(hostname: string): Promise<Company | null> {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost:3000";
  if (hostname === appDomain || hostname.startsWith("localhost")) {
    return null;
  }

  const subdomain = hostname.replace(`.${appDomain}`, "");
  if (subdomain && subdomain !== hostname) {
    return resolveTenantBySlug(subdomain);
  }

  return prisma.company.findFirst({
    where: { customDomain: hostname, status: { in: ["ACTIVE", "SUSPENDED"] } },
  });
}

export function getEffectiveCompanyId(session: {
  impersonatingCompanyId?: string | null;
  activeCompanyId?: string | null;
}): string | null {
  return session.impersonatingCompanyId ?? session.activeCompanyId ?? null;
}
