"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BarChart3,
  Kanban,
  Mail,
  Phone,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberTagBadge } from "@/components/team/member-tag-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { formatCurrency } from "@/lib/utils";

interface LeadPreview {
  id: string;
  firstName: string;
  lastName?: string | null;
  status: string;
  priority: string;
  expectedRevenue?: number | string | null;
  updatedAt: string;
}

interface ProfileData {
  memberTag?: string | null;
  user: { id: string; name: string | null; email: string; status: string; createdAt: string };
  role: { name: string; slug: string };
  stats: { assignedLeads: number; callsMade: number; emailsSent: number };
  performance: {
    totalLeadsAssigned: number;
    leadsWon: number;
    leadsLost: number;
    callsMade: number;
    emailsSent: number;
    revenueGenerated: number;
    conversionRate: number;
  };
  recentLeads: LeadPreview[];
  access: {
    modules: string[];
    capabilities: Record<string, boolean>;
  };
  viewerIsAdmin?: boolean;
}

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export function AgentHub({ userId }: { userId: string }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportStats, setReportStats] = useState<Record<string, unknown>>({});

  const isSelf = session?.user?.id === userId;
  const isAdmin =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, reportRes] = await Promise.all([
        fetch(`/api/v1/${tenantSlug}/team/${userId}`),
        fetch(`/api/v1/${tenantSlug}/dashboard?type=sales&agentId=${userId}`),
      ]);
      const profileJson = await profileRes.json();
      const reportJson = await reportRes.json();
      setProfile(profileJson.data);
      setReportStats(reportJson.stats ?? {});
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!profile) return <p className="text-muted-foreground">Member not found</p>;

  const backHref = isAdmin && !isSelf ? `/app/${tenantSlug}/agents` : `/app/${tenantSlug}/team`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{profile.user.name ?? profile.user.email}</h1>
            <MemberTagBadge tag={profile.memberTag} />
            <Badge>{profile.role.name}</Badge>
            {profile.viewerIsAdmin && <Badge variant="outline">Admin view</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{profile.user.email}</p>
        </div>
        {isAdmin && !isSelf && (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/${tenantSlug}/leads?agentId=${userId}`}>
              <UserPlus className="h-4 w-4 mr-1" />
              All leads
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned leads" value={profile.stats.assignedLeads} icon={UserPlus} />
        <StatCard label="Calls made" value={profile.stats.callsMade} icon={Phone} />
        <StatCard label="Emails sent" value={profile.stats.emailsSent} icon={Mail} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {(isSelf || isAdmin) && <TabsTrigger value="access">Access</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Won" value={profile.performance.leadsWon} />
            <StatCard label="Lost" value={profile.performance.leadsLost} />
            <StatCard
              label="Revenue"
              value={formatCurrency(profile.performance.revenueGenerated)}
            />
            <StatCard label="Conversion" value={`${profile.performance.conversionRate}%`} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/app/${tenantSlug}/leads/kanban${isAdmin && !isSelf ? `?agentId=${userId}` : ""}`}>
                  <Kanban className="h-4 w-4 mr-1" /> Pipeline board
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/app/${tenantSlug}/email-campaigns`}>
                  <Mail className="h-4 w-4 mr-1" /> Email templates
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/app/${tenantSlug}/reports${isAdmin && !isSelf ? `?agentId=${userId}` : ""}`}>
                  <BarChart3 className="h-4 w-4 mr-1" /> Reports
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Assigned leads</CardTitle>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/app/${tenantSlug}/leads?agentId=${userId}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No assigned leads</p>
              ) : (
                profile.recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/app/${tenantSlug}/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(lead.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      {lead.expectedRevenue && (
                        <span className="text-xs font-medium">
                          {formatCurrency(Number(lead.expectedRevenue))}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <Kanban className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Kanban board for {isSelf ? "your" : "this agent's"} assigned leads by status.
              </p>
              <Button asChild>
                <Link href={`/app/${tenantSlug}/leads/kanban${isAdmin && !isSelf ? `?agentId=${userId}` : ""}`}>
                  Open pipeline board
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="New leads" value={String(reportStats.newLeads ?? 0)} />
            <StatCard label="Qualified" value={String(reportStats.qualifiedLeads ?? 0)} />
            <StatCard label="Open in pipeline" value={String(reportStats.openDeals ?? 0)} />
            <StatCard label="Won" value={String(reportStats.wonDeals ?? 0)} />
            <StatCard
              label="Pipeline value"
              value={formatCurrency(Number(reportStats.pipelineValue ?? 0))}
            />
          </div>
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" /> Access & permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Modules</p>
                <div className="flex flex-wrap gap-1">
                  {profile.access.modules.map((m) => (
                    <Badge key={m} variant="outline">
                      {m.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(profile.access.capabilities).map(([key, val]) => (
                    <Badge key={key} variant={val ? "default" : "secondary"}>
                      {key.replace(/([A-Z])/g, " $1").trim()}: {val ? "Yes" : "No"}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <User className="h-3 w-3" /> Status: {profile.user.status}
                </p>
                <p>Joined: {new Date(profile.user.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
