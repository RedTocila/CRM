"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BarChart3, Mail, Phone, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
  assignedLeads: number;
  callsMade: number;
  emailsSent: number;
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

export default function AgentsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: session } = useSession();
  const canCreate =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/team?agentsOnly=true`);
      const json = await res.json();
      setAgents(json.data ?? []);
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const addAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roleSlug: "sales", memberTag: "AGENT" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add agent");
      toast.success("Agent account created");
      setDialogOpen(false);
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Sales agent accounts — each sees assigned leads, email templates, pipeline, team, and personal reports"
      >
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {canCreate && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Agent
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold">Sales Agents</h2>
            <Badge variant="secondary">{agents.length}</Badge>
          </div>
          <div className="p-5 space-y-3">
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No agents yet. Create an agent account, then assign leads from the{" "}
                <Link href={`/app/${tenantSlug}/leads`} className="text-primary underline">
                  Leads inbox
                </Link>
                .
              </p>
            )}
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/app/${tenantSlug}/agents/${a.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{a.assignedLeads} leads</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {a.callsMade}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {a.emailsSent}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/app/${tenantSlug}/agents/${a.id}`}>
                      <BarChart3 className="h-3 w-3 mr-1" /> View all
                    </Link>
                  </Button>
                  <Badge>Sales Agent</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dialogOpen && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add sales agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={addAgent} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Email (login)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
