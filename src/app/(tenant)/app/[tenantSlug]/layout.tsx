import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { getEnabledModules, getAllManifests, isModuleEnabled } from "@/lib/modules/registry";
import { TenantSidebar, AiAssistantButton } from "@/components/tenant/sidebar";
import { TenantHeader } from "@/components/tenant/header";
import { ThemeProvider } from "@/components/tenant/theme-provider";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();

  if (!session?.user) redirect("/login");

  const company = await prisma.company.findUnique({ where: { slug: tenantSlug } });
  if (!company || company.status === "DELETED") redirect("/login");

  if (!session.user.isSuperAdmin) {
    const membership = await prisma.companyMember.findFirst({
      where: { companyId: company.id, userId: session.user.id },
    });
    if (!membership) redirect("/login");
  }

  const isSuperAdmin = Boolean(session.user.isSuperAdmin);
  const enabledModules = isSuperAdmin
    ? getAllManifests()
    : await getEnabledModules(company.id);
  const aiEnabled = isSuperAdmin || (await isModuleEnabled(company.id, "ai_assistant"));

  const navModules = enabledModules.map((m) => ({
    id: m.id,
    name: m.name,
    icon: m.icon,
    category: m.category,
    routes: m.routes,
  }));

  return (
    <ThemeProvider primaryColor={company.primaryColor}>
      <div className="flex h-screen overflow-hidden bg-background">
        <TenantSidebar
          tenantSlug={tenantSlug}
          modules={navModules}
          companyName={company.displayName ?? company.name}
          logoUrl={company.logoUrl}
          primaryColor={company.primaryColor}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TenantHeader companyName={company.displayName ?? company.name} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
        {aiEnabled && <AiAssistantButton tenantSlug={tenantSlug} />}
      </div>
    </ThemeProvider>
  );
}
