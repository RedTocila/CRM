"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Headphones, TrendingUp } from "lucide-react";

const TAB_CONFIG = {
  executive: { label: "Executive", icon: BarChart3 },
  sales: { label: "Sales", icon: TrendingUp },
  support: { label: "Support", icon: Headphones },
} as const;

function formatStatValue(key: string, value: unknown): string {
  if (key.toLowerCase().includes("revenue") || key.toLowerCase().includes("value")) {
    return formatCurrency(Number(value ?? 0));
  }
  return String(value ?? 0);
}

function formatStatLabel(key: string | undefined): string {
  if (!key) return "—";
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function ReportsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState("executive");
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const load = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/dashboard?type=${type}`);
      const json = await res.json();
      setStats(json.stats ?? {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("executive");
  }, [tenantSlug]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Dashboards" description="Real-time metrics across your business" />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          load(v);
        }}
      >
        <TabsList className="bg-muted/50">
          {(Object.entries(TAB_CONFIG) as [keyof typeof TAB_CONFIG, typeof TAB_CONFIG.executive][]).map(
            ([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                <cfg.icon className="h-4 w-4" />
                {cfg.label}
              </TabsTrigger>
            )
          )}
        </TabsList>

        {(["executive", "sales", "support"] as const).map((type) => (
          <TabsContent key={type} value={type} className="mt-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(stats).map(([key, value]) => (
                  <StatCard
                    key={key}
                    label={formatStatLabel(key)}
                    value={formatStatValue(key, value)}
                    icon={TAB_CONFIG[type].icon}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
