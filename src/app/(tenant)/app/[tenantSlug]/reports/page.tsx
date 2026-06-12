"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Headphones, TrendingUp } from "lucide-react";

const TAB_CONFIG = {
  executive: { label: "Executive", icon: BarChart3 },
  sales: { label: "Sales", icon: TrendingUp },
  support: { label: "Support", icon: Headphones },
} as const;

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

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

interface AgentOption {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAgent = session?.user?.roleSlug === "sales" && !session?.user?.isSuperAdmin;
  const isAdmin =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const [activeTab, setActiveTab] = useState(isAgent ? "sales" : "executive");
  const [agentId, setAgentId] = useState(searchParams.get("agentId") ?? "");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetch(`/api/v1/${tenantSlug}/team?agentsOnly=true`)
        .then((r) => r.json())
        .then((json) => setAgents(json.data ?? []));
    }
  }, [tenantSlug, isAdmin]);

  const load = async (type: string, selectedAgent?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type });
      const aid = isAgent ? session?.user?.id : selectedAgent ?? agentId;
      if (aid) qs.set("agentId", aid);
      const res = await fetch(`/api/v1/${tenantSlug}/dashboard?${qs}`);
      const json = await res.json();
      setStats(json.stats ?? {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeTab, agentId || undefined);
  }, [tenantSlug, activeTab, agentId, isAgent, session?.user?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAgent ? "My Reports" : "Reports & Dashboards"}
        description={
          isAgent
            ? "Your assigned leads, pipeline, and performance"
            : "Real-time metrics — filter by agent to see individual performance"
        }
      >
        {isAdmin && agents.length > 0 && (
          <Select
            value={agentId || "all"}
            onValueChange={(v) => setAgentId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All company</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isAgent && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/${tenantSlug}/agents/${session?.user?.id}`}>My workspace</Link>
          </Button>
        )}
      </PageHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          load(v, agentId || undefined);
        }}
      >
        <TabsList className="bg-muted/50">
          {!isAgent && (
            <TabsTrigger value="executive" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Executive
            </TabsTrigger>
          )}
          <TabsTrigger value="sales" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            {isAgent || agentId ? "Agent sales" : "Sales"}
          </TabsTrigger>
          {!isAgent && !agentId && (
            <TabsTrigger value="support" className="gap-2">
              <Headphones className="h-4 w-4" />
              Support
            </TabsTrigger>
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
                    icon={TAB_CONFIG[type === "executive" ? "executive" : type === "sales" ? "sales" : "support"].icon}
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
