"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Send,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadPriorityBadge } from "@/components/leads/lead-priority-badge";
import { SOURCE_LABELS, FOLLOW_UP_TYPES } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { LeadAssignSelect } from "@/components/leads/lead-assign-select";

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

interface TimelineItem {
  id: string;
  type: "note" | "activity" | "call" | "email" | "followup";
  at: string;
  user?: string;
  content: string;
  meta?: string;
  isInternal?: boolean;
}

export default function LeadDetailPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const { data: session } = useSession();
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const isAdmin =
    session?.user?.isSuperAdmin ||
    ADMIN_ROLES.has(session?.user?.roleSlug ?? "");
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [callForm, setCallForm] = useState({ duration: "5", outcome: "", notes: "" });
  const [emailForm, setEmailForm] = useState({ subject: "" });
  const [followUpForm, setFollowUpForm] = useState({
    type: "CALL",
    dueAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLead(json.data);
    } catch {
      toast.error("Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, id]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo((): TimelineItem[] => {
    if (!lead) return [];
    const items: TimelineItem[] = [];

    const notes = (lead.notes as Array<Record<string, unknown>>) ?? [];
    for (const n of notes) {
      const user = n.user as { name?: string; email?: string };
      items.push({
        id: String(n.id),
        type: "note",
        at: String(n.createdAt),
        user: user?.name ?? user?.email,
        content: String(n.content),
        isInternal: Boolean(n.isInternal),
      });
    }

    const activities = (lead.activities as Array<Record<string, unknown>>) ?? [];
    for (const a of activities) {
      const user = a.user as { name?: string; email?: string };
      items.push({
        id: String(a.id),
        type: "activity",
        at: String(a.createdAt),
        user: user?.name ?? user?.email,
        content: String(a.description ?? a.type),
      });
    }

    const calls = (lead.calls as Array<Record<string, unknown>>) ?? [];
    for (const c of calls) {
      const user = c.user as { name?: string };
      items.push({
        id: String(c.id),
        type: "call",
        at: String(c.calledAt),
        user: user?.name,
        content: String(c.notes ?? c.outcome ?? "Call logged"),
        meta: `${c.duration}s`,
      });
    }

    const emails = (lead.emails as Array<Record<string, unknown>>) ?? [];
    for (const e of emails) {
      items.push({
        id: String(e.id),
        type: "email",
        at: String(e.sentAt),
        content: String(e.subject ?? "Email sent"),
        meta: [e.opened && "Opened", e.replied && "Replied", e.bounced && "Bounced"]
          .filter(Boolean)
          .join(", "),
      });
    }

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [lead]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    for (const item of timeline) {
      const day = format(new Date(item.at), "d MMMM yyyy");
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(item);
    }
    return [...groups.entries()];
  }, [timeline]);

  const postComment = async () => {
    if (!comment.trim()) return;
    const res = await fetch(`/api/v1/${tenantSlug}/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment, isInternal }),
    });
    if (res.ok) {
      setComment("");
      toast.success("Added to timeline");
      load();
    } else toast.error("Failed to add comment");
  };

  const logCall = async () => {
    const res = await fetch(`/api/v1/${tenantSlug}/leads/${id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: Number(callForm.duration) * 60,
        outcome: callForm.outcome,
        notes: callForm.notes,
      }),
    });
    if (res.ok) {
      setCallForm({ duration: "5", outcome: "", notes: "" });
      toast.success("Call logged");
      load();
    }
  };

  const logEmail = async () => {
    const res = await fetch(`/api/v1/${tenantSlug}/leads/${id}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: emailForm.subject }),
    });
    if (res.ok) {
      setEmailForm({ subject: "" });
      toast.success("Email logged");
      load();
    }
  };

  const scheduleFollowUp = async () => {
    if (!followUpForm.dueAt) return toast.error("Due date required");
    const assignee = lead?.assignedToId ?? (lead?.assignee as { id?: string })?.id;
    if (!assignee) return toast.error("Assign lead first");
    const res = await fetch(`/api/v1/${tenantSlug}/leads/${id}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: followUpForm.type,
        dueAt: new Date(followUpForm.dueAt).toISOString(),
        assignedToId: assignee,
        notes: followUpForm.notes,
      }),
    });
    if (res.ok) {
      toast.success("Follow-up scheduled");
      load();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lead) {
    return <p className="text-muted-foreground">Lead not found</p>;
  }

  const tags = (lead.tags as Array<{ tag: { name: string; color: string } }>) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href={`/app/${tenantSlug}/leads`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <LeadQuickActions
          tenantSlug={tenantSlug}
          leadId={id}
          phone={lead.phone as string | null}
          email={lead.email as string | null}
          onLogged={load}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {String(lead.firstName)} {String(lead.lastName ?? "")}
              </h1>
              {lead.company != null && lead.company !== "" && (
                <p className="text-muted-foreground">{String(lead.company)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <LeadStatusBadge status={String(lead.status)} />
              <LeadPriorityBadge priority={String(lead.priority)} />
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Assign to agent</p>
                <LeadAssignSelect
                  tenantSlug={tenantSlug}
                  leadId={id}
                  currentAssigneeId={
                    (lead.assignedToId as string | null) ??
                    (lead.assignee as { id?: string } | undefined)?.id
                  }
                  onAssigned={load}
                />
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge
                    key={t.tag.name}
                    style={{ backgroundColor: `${t.tag.color}22`, color: t.tag.color }}
                  >
                    {t.tag.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-2 text-sm">
              {lead.email != null && String(lead.email) !== "" && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {String(lead.email)}
                </p>
              )}
              {lead.phone != null && String(lead.phone) !== "" && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {String(lead.phone)}
                </p>
              )}
              {lead.whatsappNumber != null && String(lead.whatsappNumber) !== "" && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" /> {String(lead.whatsappNumber)}
                </p>
              )}
              {(lead.country != null || lead.city != null) && (
                <p className="text-muted-foreground">
                  {[lead.city, lead.country].filter(Boolean).join(", ")}
                </p>
              )}
              {lead.source != null && (
                <p className="text-muted-foreground">
                  Source: {SOURCE_LABELS[String(lead.source)] ?? String(lead.source)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Lead Value</p>
                <p className="font-medium">
                  {lead.leadValue != null ? formatCurrency(Number(lead.leadValue)) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Expected Revenue</p>
                <p className="font-medium">
                  {lead.expectedRevenue != null
                    ? formatCurrency(Number(lead.expectedRevenue))
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Conversion</p>
                <p className="font-medium">
                  {lead.conversionProbability != null
                    ? `${lead.conversionProbability}%`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Next Follow-up</p>
                <p className="font-medium">
                  {lead.nextFollowUpDate
                    ? format(new Date(String(lead.nextFollowUpDate)), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="actions">Log Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-6 mt-4">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <Textarea
                  placeholder="Add a comment or note..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <Lock className="h-3 w-3" /> Internal note
                  </label>
                  <Button size="sm" onClick={postComment}>
                    <Send className="h-4 w-4 mr-1" /> Post
                  </Button>
                </div>
              </div>

              {groupedTimeline.map(([day, items]) => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{day}</h3>
                  <div className="space-y-3 border-l-2 border-muted ml-2 pl-4">
                    {items.map((item) => (
                      <div key={item.id} className="relative">
                        <div className="rounded-lg border bg-card p-3 text-sm">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium">
                              {item.user ?? "System"}
                              {item.isInternal && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Internal
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.at), "HH:mm")}
                            </span>
                          </div>
                          <p>{item.content}</p>
                          {item.meta && (
                            <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No activity yet. Add a comment or log a call.
                </p>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 mt-4">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Log Call
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      value={callForm.duration}
                      onChange={(e) =>
                        setCallForm((f) => ({ ...f, duration: e.target.value }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Outcome</Label>
                    <Input
                      value={callForm.outcome}
                      onChange={(e) =>
                        setCallForm((f) => ({ ...f, outcome: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Call notes..."
                  value={callForm.notes}
                  onChange={(e) => setCallForm((f) => ({ ...f, notes: e.target.value }))}
                />
                <Button size="sm" onClick={logCall}>
                  Save Call
                </Button>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Log Email
                </h3>
                <Input
                  placeholder="Subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ subject: e.target.value })}
                />
                <Button size="sm" onClick={logEmail}>
                  Save Email
                </Button>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Schedule Follow-up
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={followUpForm.type}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      {FOLLOW_UP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Due</Label>
                    <Input
                      type="datetime-local"
                      value={followUpForm.dueAt}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, dueAt: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button size="sm" onClick={scheduleFollowUp}>
                  Schedule
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
