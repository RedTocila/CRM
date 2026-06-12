"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberTagBadge } from "@/components/team/member-tag-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileData {
  memberTag?: string | null;
  user: { id: string; name: string | null; email: string; status: string; createdAt: string };
  role: { name: string; slug: string };
  stats: { assignedLeads: number; callsMade: number; emailsSent: number };
  access: {
    modules: string[];
    permissions: string[];
    capabilities: Record<string, boolean>;
  };
}

export default function AgentProfilePage() {
  const { tenantSlug, userId } = useParams<{ tenantSlug: string; userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/team/${userId}`);
      const json = await res.json();
      setProfile(json.data);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!profile) return <p className="text-muted-foreground">Member not found</p>;

  const caps = profile.access.capabilities;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/app/${tenantSlug}/team`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{profile.user.name ?? profile.user.email}</h1>
            <MemberTagBadge tag={profile.memberTag} />
            <Badge>{profile.role.name}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.stats.assignedLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.stats.callsMade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.stats.emailsSent}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Access & permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(caps).map(([key, val]) => (
                <Badge key={key} variant={val ? "default" : "secondary"}>
                  {key.replace(/([A-Z])/g, " $1").trim()}: {val ? "Yes" : "No"}
                </Badge>
              ))}
            </div>
          </div>
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
            <p className="text-sm font-medium mb-2">Account</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-2">
                <User className="h-3 w-3" /> Status: {profile.user.status}
              </p>
              <p>Joined: {new Date(profile.user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
