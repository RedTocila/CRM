"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadPriorityBadge } from "@/components/leads/lead-priority-badge";
import { LOST_BUCKET_KEY } from "@/lib/leads/kanban-constants";
import { STATUS_LABELS } from "@/lib/leads/constants";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface LeadCard {
  id: string;
  firstName: string;
  lastName?: string | null;
  company?: string | null;
  status: string;
  priority: string;
  expectedRevenue?: number | string | null;
}

interface BoardColumn {
  statusKey: string;
  label: string;
  order: number;
  leads: LeadCard[];
}

interface ColumnDraft {
  statusKey: string;
  label: string;
  order: number;
}

interface AvailableStage {
  statusKey: string;
  defaultLabel: string;
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

function statusForDrop(statusKey: string): string {
  return statusKey === LOST_BUCKET_KEY ? "LOST" : statusKey;
}

function KanbanCard({ lead, onClick }: { lead: LeadCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="rounded-md border bg-card p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow transition-shadow space-y-1.5"
    >
      <p className="font-medium text-sm leading-tight">
        {lead.firstName} {lead.lastName}
      </p>
      {lead.company && (
        <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
      )}
      <div className="flex items-center justify-between gap-1">
        <LeadPriorityBadge priority={lead.priority} />
        {lead.expectedRevenue != null && Number(lead.expectedRevenue) > 0 && (
          <span className="text-xs font-medium tabular-nums">
            {formatCurrency(Number(lead.expectedRevenue))}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumnCell({
  column,
  children,
  columnCount,
}: {
  column: BoardColumn;
  children: React.ReactNode;
  columnCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.statusKey });

  return (
    <div
      className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-muted/20"
      style={{ gridColumn: `span 1` }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-card/60 px-3 py-2 rounded-t-lg">
        <h3 className="truncate text-xs font-semibold uppercase tracking-wide">{column.label}</h3>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {column.leads.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-0 flex-1 overflow-y-auto p-2 space-y-2 transition-colors rounded-b-lg ${
          isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : ""
        }`}
        style={{ maxHeight: columnCount > 6 ? undefined : "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

export function LeadPipelineBoard() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const router = useRouter();
  const { data: session } = useSession();

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [activeLead, setActiveLead] = useState<LeadCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnDraft[]>([]);
  const [availableToAdd, setAvailableToAdd] = useState<AvailableStage[]>([]);
  const [newStageKey, setNewStageKey] = useState("");
  const [savingStages, setSavingStages] = useState(false);

  const canManage =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = agentId ? `?agentId=${agentId}` : "";
      const res = await fetch(`/api/v1/${tenantSlug}/leads/kanban${qs}`);
      const json = await res.json();
      setColumns(json.data ?? []);
    } catch {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, agentId]);

  const loadStageEditor = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads/kanban/columns`);
      const json = await res.json();
      setDraftColumns(json.data ?? []);
      setAvailableToAdd(json.availableToAdd ?? []);
      if (json.availableToAdd?.[0]) {
        setNewStageKey(json.availableToAdd[0].statusKey);
      }
    } catch {
      toast.error("Failed to load stage settings");
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editOpen && canManage) {
      loadStageEditor();
    }
  }, [editOpen, canManage, loadStageEditor]);

  const allLeads = columns.flatMap((c) => c.leads);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetKey = String(over.id);
    const lead = allLeads.find((l) => l.id === leadId);
    if (!lead) return;

    const newStatus = statusForDrop(targetKey);
    const sourceKey =
      columns.find((col) => col.leads.some((l) => l.id === leadId))?.statusKey ?? lead.status;

    if (sourceKey === targetKey) return;

    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        leads: col.leads.filter((l) => l.id !== leadId),
      }));
      const target = next.find((c) => c.statusKey === targetKey);
      if (target) {
        target.leads = [{ ...lead, status: newStatus }, ...target.leads];
      }
      return next;
    });

    const res = await fetch(`/api/v1/${tenantSlug}/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      toast.error("Failed to move lead");
      load();
    }
  };

  const updateDraftLabel = (index: number, label: string) => {
    setDraftColumns((rows) =>
      rows.map((row, i) => (i === index ? { ...row, label } : row))
    );
  };

  const removeDraftRow = (index: number) => {
    if (draftColumns.length <= 1) {
      toast.error("Keep at least one stage");
      return;
    }
    const removed = draftColumns[index];
    setDraftColumns((rows) => rows.filter((_, i) => i !== index));
    setAvailableToAdd((avail) => [
      ...avail,
      {
        statusKey: removed.statusKey,
        defaultLabel:
          removed.statusKey === LOST_BUCKET_KEY
            ? "Lost / Closed"
            : STATUS_LABELS[removed.statusKey] ?? removed.statusKey,
      },
    ]);
  };

  const addDraftRow = () => {
    if (!newStageKey) return;
    const stage = availableToAdd.find((s) => s.statusKey === newStageKey);
    if (!stage) return;
    setDraftColumns((rows) => [
      ...rows,
      { statusKey: stage.statusKey, label: stage.defaultLabel, order: rows.length },
    ]);
    setAvailableToAdd((avail) => avail.filter((s) => s.statusKey !== newStageKey));
    const next = availableToAdd.find((s) => s.statusKey !== newStageKey);
    setNewStageKey(next?.statusKey ?? "");
  };

  const saveStages = async () => {
    if (draftColumns.some((c) => !c.label.trim())) {
      toast.error("Every stage needs a label");
      return;
    }
    setSavingStages(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads/kanban/columns`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: draftColumns.map((col, order) => ({
            statusKey: col.statusKey,
            label: col.label.trim(),
            order,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save stages");
        return;
      }
      toast.success("Pipeline stages updated");
      setEditOpen(false);
      load();
    } finally {
      setSavingStages(false);
    }
  };

  const columnCount = columns.length;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3rem)] min-h-[480px] flex-col gap-3 -m-2 sm:-m-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {agentId ? "Agent pipeline" : "Lead pipeline"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {agentId ? "Assigned leads by stage" : "All leads in one board — stages separated"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/${tenantSlug}/leads`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> List
            </Link>
          </Button>
          {canManage && (
            <Button
              variant={editOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setEditOpen((v) => !v)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              {editOpen ? "Close editor" : "Edit stages"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={load} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {editOpen && canManage && (
        <div className="shrink-0 rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Stage labels & rows</p>
              <p className="text-xs text-muted-foreground">
                Rename column headers or add stages from available lead statuses
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2 w-40">Stage key</th>
                  <th className="px-3 py-2">Column label</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {draftColumns.map((row, index) => (
                  <tr key={row.statusKey} className="border-b last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.statusKey}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.label}
                        onChange={(e) => updateDraftLabel(index, e.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={draftColumns.length <= 1}
                        onClick={() => removeDraftRow(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {availableToAdd.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-xs">Add stage row</Label>
                <Select value={newStageKey} onValueChange={setNewStageKey}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pick stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((s) => (
                      <SelectItem key={s.statusKey} value={s.statusKey}>
                        {s.defaultLabel} ({s.statusKey})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDraftRow}>
                <Plus className="h-4 w-4 mr-1" /> Add row
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveStages} disabled={savingStages}>
              {savingStages ? "Saving…" : "Save stages"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton className="min-h-0 flex-1 w-full rounded-lg" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => {
            const lead = allLeads.find((l) => l.id === e.active.id);
            setActiveLead(lead ?? null);
          }}
          onDragEnd={handleDragEnd}
        >
          <div
            className="grid min-h-0 flex-1 gap-2 overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              gridTemplateRows: "1fr",
            }}
          >
            {columns.map((column) => (
              <KanbanColumnCell key={column.statusKey} column={column} columnCount={columnCount}>
                <SortableContext
                  items={column.leads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.leads.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No leads</p>
                  ) : (
                    column.leads.map((lead) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                      />
                    ))
                  )}
                </SortableContext>
              </KanbanColumnCell>
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="rounded-md border bg-card p-2.5 shadow-lg w-[200px]">
                <p className="font-medium text-sm">
                  {activeLead.firstName} {activeLead.lastName}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
