"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface LeadAssignSelectProps {
  tenantSlug: string;
  leadId: string;
  currentAssigneeId?: string | null;
  onAssigned?: () => void;
  compact?: boolean;
}

export function LeadAssignSelect({
  tenantSlug,
  leadId,
  currentAssigneeId,
  onAssigned,
  compact,
}: LeadAssignSelectProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [value, setValue] = useState(currentAssigneeId ?? "unassigned");

  useEffect(() => {
    setValue(currentAssigneeId ?? "unassigned");
  }, [currentAssigneeId]);

  useEffect(() => {
    fetch(`/api/v1/${tenantSlug}/team?agentsOnly=true`)
      .then((r) => r.json())
      .then((json) => setAgents(json.data ?? []))
      .catch(() => setAgents([]));
  }, [tenantSlug]);

  const assign = async (assigneeId: string) => {
    const assignedToId = assigneeId === "unassigned" ? null : assigneeId;
    setValue(assigneeId);
    const res = await fetch(`/api/v1/${tenantSlug}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (res.ok) {
      toast.success(assignedToId ? "Lead assigned to agent" : "Lead unassigned");
      onAssigned?.();
    } else {
      toast.error("Failed to assign lead");
      setValue(currentAssigneeId ?? "unassigned");
    }
  };

  return (
    <div
      className={compact ? "min-w-[140px]" : "w-full"}
      onClick={(e) => e.stopPropagation()}
    >
      <Select value={value} onValueChange={assign}>
        <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
          {!compact && <UserPlus className="h-4 w-4 mr-2 shrink-0" />}
          <SelectValue placeholder="Assign agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned (inbox)</SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name || a.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
