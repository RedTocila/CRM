import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";
import { Users, UserPlus, Briefcase, DollarSign, CheckSquare, Headphones } from "lucide-react";
import { DashboardCharts } from "@/components/leads/dashboard-charts";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();
  const company = await prisma.company.findUnique({ where: { slug: tenantSlug } });
  if (!company) return null;

  const [leads, contacts, deals, tasks, tickets] = await Promise.all([
    prisma.lead.count({ where: { companyId: company.id, deletedAt: null } }),
    prisma.contact.count({ where: { companyId: company.id, deletedAt: null } }),
    prisma.deal.findMany({ where: { companyId: company.id, status: "OPEN", deletedAt: null } }),
    prisma.task.count({ where: { companyId: company.id, status: { not: "DONE" }, deletedAt: null } }),
    prisma.ticket.count({ where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const pipelineValue = deals.reduce((sum, d) => sum + Number(d.value), 0);

  const stats = [
    { label: "Leads", value: leads, icon: UserPlus },
    { label: "Contacts", value: contacts, icon: Users },
    { label: "Open Deals", value: deals.length, icon: Briefcase },
    { label: "Pipeline Value", value: formatCurrency(pipelineValue), icon: DollarSign },
    { label: "Open Tasks", value: tasks, icon: CheckSquare },
    { label: "Open Tickets", value: tickets, icon: Headphones },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's what's happening in your workspace today"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <DashboardCharts tenantSlug={tenantSlug} />
    </div>
  );
}
