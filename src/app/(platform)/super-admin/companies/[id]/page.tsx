"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/data-table";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  modules: { moduleId: string; enabled: boolean; module: { name: string } }[];
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { update } = useSession();
  const [company, setCompany] = useState<CompanyDetail | null>(null);

  const load = () =>
    fetch(`/api/platform/companies/${id}`)
      .then((r) => r.json())
      .then((d) => setCompany(d.company ?? d));

  useEffect(() => {
    load();
  }, [id]);

  const toggleStatus = async () => {
    const newStatus = company?.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await fetch(`/api/platform/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(`Company ${newStatus.toLowerCase()}`);
    load();
  };

  const toggleModule = async (moduleId: string, enabled: boolean) => {
    await fetch(`/api/platform/companies/${id}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [{ moduleId, enabled }] }),
    });
    load();
  };

  const impersonate = async () => {
    const res = await fetch(`/api/platform/companies/${id}/impersonate`, { method: "POST" });
    const data = await res.json();
    if (data.sessionUpdate) {
      await update(data.sessionUpdate);
      window.location.href = `/app/${company?.slug}`;
    }
  };

  if (!company) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">/{company.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleStatus}>
            {company.status === "ACTIVE" ? "Suspend" : "Activate"}
          </Button>
          <Button onClick={impersonate}>Impersonate</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status <StatusBadge status={company.status} />
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Toggles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {company.modules?.map((m) => (
            <div
              key={m.moduleId}
              className={`flex items-center justify-between rounded-lg p-2 ${
                m.moduleId === "ai_assistant" ? "border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20" : ""
              }`}
            >
              <div>
                <Label>{m.module?.name ?? m.moduleId}</Label>
                {m.moduleId === "ai_assistant" && (
                  <p className="text-xs text-muted-foreground">
                    Enable or disable AI assistant for this tenant
                  </p>
                )}
              </div>
              <Switch
                checked={m.enabled}
                onCheckedChange={(checked) => toggleModule(m.moduleId, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
