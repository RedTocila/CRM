"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberTagBadge } from "@/components/team/member-tag-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Member {
  id: string;
  memberTag?: string | null;
  user: { id: string; name: string | null; email: string };
  role: { name: string; slug: string };
}

const MEMBER_TAGS = ["ADMIN", "AGENT", "DEVELOPER", "MANAGER"] as const;
const ADMIN_ROLES = new Set(["owner", "admin"]);
const ADMIN_VIEW_ROLES = new Set(["owner", "admin", "manager"]);

export default function TeamPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    memberTag: "AGENT" as string,
    roleSlug: "sales",
  });

  const canManageAccounts =
    session?.user?.isSuperAdmin ||
    ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const canViewAgentProfiles =
    session?.user?.isSuperAdmin ||
    ADMIN_VIEW_ROLES.has(session?.user?.roleSlug ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/team`);
      const json = await res.json();
      setMembers(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (m: Member) => {
    setEditMember(m);
    setForm({
      name: m.user.name ?? "",
      email: m.user.email,
      password: "",
      memberTag: m.memberTag ?? "AGENT",
      roleSlug: m.role.slug,
    });
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        memberTag: form.memberTag,
        roleSlug: form.roleSlug,
      };
      if (canManageAccounts) {
        if (form.name) payload.name = form.name;
        if (form.email) payload.email = form.email;
        if (form.password) payload.password = form.password;
      }
      const res = await fetch(`/api/v1/${tenantSlug}/team/${editMember.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success("Member updated");
      setEditMember(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={
          canManageAccounts
            ? "Everyone in your workspace — click an agent to see their full workspace"
            : "Your team — view your profile and colleagues"
        }
      >
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {canManageAccounts && (
          <Button size="sm" asChild>
            <Link href={`/app/${tenantSlug}/agents`}>
              <UserPlus className="h-4 w-4 mr-1" /> Create Account
            </Link>
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">All members</h2>
          </div>
          <div className="p-5 space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0 gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {canViewAgentProfiles || m.user.id === session?.user?.id ? (
                      <Link
                        href={`/app/${tenantSlug}/agents/${m.user.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {m.user.name ?? m.user.email}
                      </Link>
                    ) : (
                      <span className="font-medium text-sm">{m.user.name ?? m.user.email}</span>
                    )}
                    <MemberTagBadge tag={m.memberTag} />
                  </div>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={m.role.slug === "sales" ? "default" : "outline"}>
                    {m.role.name}
                  </Badge>
                  {canManageAccounts && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMember} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>New password (leave blank to keep)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={8}
              />
            </div>
            <div>
              <Label>Tag</Label>
              <Select value={form.memberTag} onValueChange={(v) => setForm((f) => ({ ...f, memberTag: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_TAGS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.roleSlug} onValueChange={(v) => setForm((f) => ({ ...f, roleSlug: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["owner", "admin", "manager", "sales", "support", "marketing"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMember(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
