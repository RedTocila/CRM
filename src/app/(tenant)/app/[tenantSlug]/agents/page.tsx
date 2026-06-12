"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
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
        body: JSON.stringify({ ...form, roleSlug: "sales" }),
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
        description="Create sales agent logins. New leads stay in your inbox until you assign them."
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
                No agents yet.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => setDialogOpen(true)}
                >
                  Add your first agent
                </button>{" "}
                to start assigning leads from the{" "}
                <Link href={`/app/${tenantSlug}/leads`} className="text-primary underline">
                  Leads inbox
                </Link>
                .
              </p>
            )}
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/app/${tenantSlug}/agents/${a.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Badge>Sales Agent</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
