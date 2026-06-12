"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { SimpleBarChart } from "@/components/leads/simple-bar-chart";
import { formatCurrency } from "@/lib/utils";
import { SOURCE_LABELS } from "@/lib/leads/constants";
import {
  UserPlus,
  Target,
  Trophy,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardChartsProps {
  tenantSlug: string;
}

export function DashboardCharts({ tenantSlug }: DashboardChartsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [charts, setCharts] = useState<{
    leadsPerMonth: { month: string; count: number }[];
    leadSources: { source: string; count: number }[];
    funnel: { stage: string; count: number }[];
  }>({ leadsPerMonth: [], leadSources: [], funnel: [] });

  useEffect(() => {
    fetch(`/api/v1/${tenantSlug}/leads/stats`)
      .then((r) => r.json())
      .then((json) => {
        setStats(json.stats ?? {});
        setCharts(json.charts ?? { leadsPerMonth: [], leadSources: [], funnel: [] });
      })
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={stats.totalLeads ?? 0} icon={UserPlus} />
        <StatCard label="Qualified" value={stats.qualifiedLeads ?? 0} icon={Target} />
        <StatCard label="Won" value={stats.wonLeads ?? 0} icon={Trophy} />
        <StatCard
          label="Conversion"
          value={`${stats.conversionRate ?? 0}%`}
          icon={BarChart3}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New Leads" value={stats.newLeads ?? 0} icon={UserPlus} />
        <StatCard label="Lost" value={stats.lostLeads ?? 0} icon={TrendingDown} />
        <StatCard
          label="Revenue"
          value={formatCurrency(stats.revenueGenerated ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          label="Forecast"
          value={formatCurrency(stats.revenueForecast ?? 0)}
          icon={DollarSign}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-1">
          <h3 className="font-semibold mb-4">Leads per Month</h3>
          <SimpleBarChart
            data={charts.leadsPerMonth.map((m) => ({
              label: m.month,
              value: m.count,
            }))}
          />
        </div>
        <div className="rounded-xl border bg-card p-5 lg:col-span-1">
          <h3 className="font-semibold mb-4">Lead Sources</h3>
          <SimpleBarChart
            data={charts.leadSources.map((s) => ({
              label: SOURCE_LABELS[s.source] ?? s.source,
              value: s.count,
            }))}
          />
        </div>
        <div className="rounded-xl border bg-card p-5 lg:col-span-1">
          <h3 className="font-semibold mb-4">Conversion Funnel</h3>
          <SimpleBarChart
            data={charts.funnel.map((f) => ({ label: f.stage, value: f.count }))}
          />
        </div>
      </div>
    </div>
  );
}
