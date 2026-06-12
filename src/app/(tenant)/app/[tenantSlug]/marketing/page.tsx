"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link2, Megaphone, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface FbIntegration {
  connected: boolean;
  adAccountId?: string;
  adAccountName?: string;
  pageId?: string;
  pageName?: string;
  lastSyncAt?: string;
  settings?: {
    syncLeads?: boolean;
    autoCreateLeads?: boolean;
    campaignManagement?: boolean;
  };
}

export default function MarketingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [integration, setIntegration] = useState<FbIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [form, setForm] = useState({
    accessToken: "",
    adAccountId: "",
    adAccountName: "",
    pageId: "",
    pageName: "",
  });
  const [settings, setSettings] = useState({
    syncLeads: true,
    autoCreateLeads: true,
    campaignManagement: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/marketing/facebook`);
      const json = await res.json();
      const data = json.data ?? { connected: false };
      setIntegration(data);
      if (data.settings) setSettings({ ...settings, ...data.settings });
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/marketing/facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      toast.success("Facebook Ads connected");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Facebook Ads?")) return;
    await fetch(`/api/v1/${tenantSlug}/marketing/facebook`, { method: "DELETE" });
    toast.success("Disconnected");
    load();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Connect ad platforms and manage campaigns"
      >
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-[#1877F2]" />
              <div>
                <CardTitle>Facebook Ads</CardTitle>
                <CardDescription>
                  Connect your Meta ad account to sync leads and manage campaigns
                </CardDescription>
              </div>
            </div>
            <Badge variant={integration?.connected ? "default" : "secondary"}>
              {integration?.connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {integration?.connected ? (
            <>
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Ad account:</span>{" "}
                  {integration.adAccountName ?? integration.adAccountId}
                </p>
                {integration.pageName && (
                  <p>
                    <span className="text-muted-foreground">Page:</span> {integration.pageName}
                  </p>
                )}
                {integration.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium text-sm">Integration options</h3>
                <div className="flex items-center justify-between">
                  <Label>Sync leads from Facebook Lead Ads</Label>
                  <Switch
                    checked={settings.syncLeads}
                    onCheckedChange={(v) => setSettings((s) => ({ ...s, syncLeads: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-create CRM leads</Label>
                  <Switch
                    checked={settings.autoCreateLeads}
                    onCheckedChange={(v) => setSettings((s) => ({ ...s, autoCreateLeads: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Campaign management</Label>
                  <Switch
                    checked={settings.campaignManagement}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({ ...s, campaignManagement: v }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <h3 className="font-medium text-sm mb-2">Campaign tools</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  View performance, pause campaigns, adjust budgets, and create lookalike audiences
                  from your CRM segments.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled>
                    View campaigns
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Create campaign
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Audience sync
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Full campaign API requires Meta Business verification. Connection stores credentials
                  for when API access is enabled.
                </p>
              </div>

              <Button variant="destructive" size="sm" onClick={disconnect}>
                <Unlink className="h-4 w-4 mr-1" /> Disconnect
              </Button>
            </>
          ) : (
            <form onSubmit={connect} className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                Paste your Meta access token and ad account ID from{" "}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Graph API Explorer
                </a>
                .
              </p>
              <div>
                <Label>Access token</Label>
                <Input
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Ad account ID</Label>
                <Input
                  placeholder="act_123456789"
                  value={form.adAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, adAccountId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Ad account name (optional)</Label>
                <Input
                  value={form.adAccountName}
                  onChange={(e) => setForm((f) => ({ ...f, adAccountName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Facebook page ID (optional)</Label>
                <Input
                  value={form.pageId}
                  onChange={(e) => setForm((f) => ({ ...f, pageId: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={connecting}>
                <Link2 className="h-4 w-4 mr-1" />
                {connecting ? "Connecting..." : "Connect Facebook Ads"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
