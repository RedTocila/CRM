"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES } from "@/lib/leads/constants";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface LeadsBulkBarProps {
  tenantSlug: string;
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}

export function LeadsBulkBar({ tenantSlug, selectedIds, onClear, onDone }: LeadsBulkBarProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignee, setAssignee] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/${tenantSlug}/team?agentsOnly=true`)
      .then((r) => r.json())
      .then((json) => setAgents(json.data ?? []));
  }, [tenantSlug]);

  const bulk = async (payload: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: selectedIds, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Bulk action failed");
      toast.success(`Updated ${json.affected ?? selectedIds.length} leads`);
      onClear();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = () => {
    if (!assignee) return;
    bulk({
      action: "assign",
      assignedToId: assignee === "unassigned" ? null : assignee,
    });
  };

  const handleStatus = () => {
    if (!status) return;
    bulk({ action: "update", status });
  };

  const handleDelete = () => {
    if (!confirm(`Delete ${selectedIds.length} lead(s)?`)) return;
    bulk({ action: "delete" });
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name || a.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" disabled={!assignee || loading} onClick={handleAssign}>
          Assign
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Set status..." />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" disabled={!status || loading} onClick={handleStatus}>
          Update
        </Button>
      </div>
      <Button size="sm" variant="destructive" disabled={loading} onClick={handleDelete}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
