import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";
import { Users, UserPlus, Briefcase, DollarSign, CheckSquare, Headphones } from "lucide-react";
import { DashboardCharts } from "@/components/leads/dashboard-charts";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();
  const company = await prisma.company.findUnique({ where: { slug: tenantSlug } });
  if (!company) return null;

  const isAgent =
    session?.user?.roleSlug === "sales" && !session?.user?.isSuperAdmin;
  const agentId = isAgent ? session!.user!.id : null;
  const leadFilter = {
    companyId: company.id,
    deletedAt: null,
    ...(agentId ? { assignedToId: agentId } : {}),
  };

  const [leads, contacts, openPipeline, wonRevenue, tasks, tickets] = await Promise.all([
    prisma.lead.count({ where: leadFilter }),
    agentId
      ? prisma.lead.count({ where: { ...leadFilter, status: "QUALIFIED" } })
      : prisma.contact.count({ where: { companyId: company.id, deletedAt: null } }),
    prisma.lead.count({
      where: {
        ...leadFilter,
        status: { notIn: ["WON", "LOST", "NOT_INTERESTED"] },
      },
    }),
    prisma.lead.aggregate({
      where: { ...leadFilter, status: "WON" },
      _sum: { expectedRevenue: true },
    }),
    agentId
      ? prisma.leadFollowUp.count({
          where: { companyId: company.id, assignedToId: agentId, completed: false },
        })
      : prisma.task.count({
          where: { companyId: company.id, status: { not: "DONE" }, deletedAt: null },
        }),
    agentId
      ? prisma.leadCall.count({ where: { companyId: company.id, userId: agentId } })
      : prisma.ticket.count({
          where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
        }),
  ]);

  const stats = isAgent
    ? [
        { label: "My Leads", value: leads, icon: UserPlus },
        { label: "Qualified", value: contacts, icon: Users },
        { label: "In Pipeline", value: openPipeline, icon: Briefcase },
        { label: "Won Revenue", value: formatCurrency(Number(wonRevenue._sum.expectedRevenue ?? 0)), icon: DollarSign },
        { label: "Follow-ups Due", value: tasks, icon: CheckSquare },
        { label: "Calls Made", value: tickets, icon: Headphones },
      ]
    : [
        { label: "Leads", value: leads, icon: UserPlus },
        { label: "Contacts", value: contacts, icon: Users },
        { label: "Open Pipeline", value: openPipeline, icon: Briefcase },
        { label: "Won Revenue", value: formatCurrency(Number(wonRevenue._sum.expectedRevenue ?? 0)), icon: DollarSign },
        { label: "Open Tasks", value: tasks, icon: CheckSquare },
        { label: "Open Tickets", value: tickets, icon: Headphones },
      ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "there"}`}
        description={
          isAgent
            ? "Your assigned leads and activity at a glance"
            : "Here's what's happening in your workspace today"
        }
      >
        {isAgent && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/${tenantSlug}/agents/${session?.user?.id}`}>My workspace</Link>
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <DashboardCharts tenantSlug={tenantSlug} />
    </div>
  );
}
