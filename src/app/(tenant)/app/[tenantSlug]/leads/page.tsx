"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Download,
  Filter,
  Inbox,
  Kanban,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadPriorityBadge } from "@/components/leads/lead-priority-badge";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { LeadAssignSelect } from "@/components/leads/lead-assign-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_SOURCES, SOURCE_LABELS } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { LeadsBulkBar } from "@/components/leads/leads-bulk-bar";

interface LeadRow {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: string;
  priority: string;
  source?: string | null;
  assignedToId?: string | null;
  expectedRevenue?: number | string | null;
  assignee?: { id?: string; name?: string | null; email: string } | null;
  tags?: { tag: { name: string; color: string } }[];
}

const ADMIN_ROLES = new Set(["owner", "admin", "manager"]);

export default function LeadsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [assigned, setAssigned] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAdmin =
    session?.user?.isSuperAdmin ||
    ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (source !== "all") params.set("source", source);
      if (assigned !== "all") params.set("assigned", assigned);
      const res = await fetch(`/api/v1/${tenantSlug}/leads?${params}`);
      const json = await res.json();
      setLeads(json.data ?? []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, status, source, assigned]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleExport = () => {
    window.open(`/api/v1/${tenantSlug}/leads/export?format=csv`, "_blank");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/v1/${tenantSlug}/leads/import`, { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      toast.success(`Imported ${json.imported} leads`);
      load();
    } else {
      toast.error(json.error ?? "Import failed");
    }
    e.target.value = "";
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Lead Inbox" : "My Leads"}
        description={
          isAdmin
            ? "All new leads arrive here unassigned — assign them to your agents"
            : "Leads assigned to you"
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/${tenantSlug}/leads/kanban`}>
            <Kanban className="h-4 w-4 mr-1" /> Pipeline
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/${tenantSlug}/leads/performance`}>
            <Users className="h-4 w-4 mr-1" /> Performance
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/${tenantSlug}/agents`}>
              <Users className="h-4 w-4 mr-1" /> Agents
            </Link>
          </Button>
        )}
        <label>
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-1" /> Import
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Button size="sm" onClick={() => router.push(`/app/${tenantSlug}/leads/new`)}>
          <Plus className="h-4 w-4 mr-1" /> New Lead
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, company..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {isAdmin && (
          <Select value={assigned} onValueChange={setAssigned}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Inbox className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leads</SelectItem>
              <SelectItem value="unassigned">Unassigned inbox</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isAdmin && (
        <LeadsBulkBar
          tenantSlug={tenantSlug}
          selectedIds={[...selected]}
          onClear={() => setSelected(new Set())}
          onDone={load}
        />
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {isAdmin && (
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selected.size === leads.length}
                      onChange={toggleAll}
                      aria-label="Select all leads"
                    />
                  </th>
                )}
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Company</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Contact</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Priority</th>
                {isAdmin && (
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Assign</th>
                )}
                <th className="text-center p-3 font-medium">Actions</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={isAdmin ? 9 : 7} className="p-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      {isAdmin && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => toggleOne(lead.id)}
                            aria-label={`Select ${lead.firstName}`}
                          />
                        </td>
                      )}
                      <td
                        className="p-3 cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        <p className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </p>
                        {lead.source && (
                          <p className="text-xs text-muted-foreground">
                            {SOURCE_LABELS[lead.source] ?? lead.source}
                          </p>
                        )}
                      </td>
                      <td
                        className="p-3 hidden md:table-cell text-muted-foreground cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        {lead.company ?? "—"}
                      </td>
                      <td
                        className="p-3 hidden lg:table-cell cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        <p className="text-muted-foreground">{lead.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </td>
                      <td
                        className="p-3 cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td
                        className="p-3 hidden sm:table-cell cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        <LeadPriorityBadge priority={lead.priority} />
                      </td>
                      {isAdmin && (
                        <td className="p-3 hidden lg:table-cell">
                          <LeadAssignSelect
                            tenantSlug={tenantSlug}
                            leadId={lead.id}
                            currentAssigneeId={lead.assignedToId ?? lead.assignee?.id}
                            onAssigned={load}
                            compact
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex justify-center">
                          <LeadQuickActions
                            tenantSlug={tenantSlug}
                            leadId={lead.id}
                            phone={lead.phone}
                            email={lead.email}
                            size="icon"
                            onLogged={load}
                          />
                        </div>
                      </td>
                      <td
                        className="p-3 text-right hidden md:table-cell cursor-pointer"
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      >
                        {lead.expectedRevenue
                          ? formatCurrency(Number(lead.expectedRevenue))
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && leads.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No leads found</p>
          )}
        </div>
      </div>
    </div>
  );
}
