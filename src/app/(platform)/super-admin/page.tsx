import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Building2, CreditCard, Users, AlertTriangle } from "lucide-react";

export default async function SuperAdminDashboard() {
  const [companies, users, activeSubscriptions, suspended] = await Promise.all([
    prisma.company.count({ where: { status: { not: "DELETED" } } }),
    prisma.user.count(),
    prisma.companySubscription.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
  ]);

  const stats = [
    { label: "Total Companies", value: companies, icon: Building2 },
    { label: "Total Users", value: users, icon: Users },
    { label: "Active Subscriptions", value: activeSubscriptions, icon: CreditCard },
    { label: "Suspended Companies", value: suspended, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Platform Overview" description="Monitor tenants, subscriptions, and platform health" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>
    </div>
  );
}
