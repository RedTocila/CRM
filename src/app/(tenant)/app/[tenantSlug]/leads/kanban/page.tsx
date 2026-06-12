"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadPriorityBadge } from "@/components/leads/lead-priority-badge";
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

interface Column {
  status: string;
  leads: LeadCard[];
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
      className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow space-y-2"
    >
      <p className="font-medium text-sm">
        {lead.firstName} {lead.lastName}
      </p>
      {lead.company && (
        <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
      )}
      <div className="flex items-center justify-between">
        <LeadPriorityBadge priority={lead.priority} />
        {lead.expectedRevenue && (
          <span className="text-xs font-medium">
            {formatCurrency(Number(lead.expectedRevenue))}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  children,
}: {
  column: Column;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const label = STATUS_LABELS[column.status] ?? column.status.replace(/_/g, " ");

  return (
    <div className="min-w-[280px] flex-shrink-0 flex flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50 rounded-t-xl">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="secondary">{column.leads.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-2 min-h-[240px] transition-colors rounded-b-xl ${isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function LeadsKanbanPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [activeLead, setActiveLead] = useState<LeadCard | null>(null);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads/kanban`);
      const json = await res.json();
      setColumns(json.data ?? []);
    } catch {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const allLeads = columns.flatMap((c) => c.leads);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStatus = String(over.id);
    const lead = allLeads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        leads: col.leads.filter((l) => l.id !== leadId),
      }));
      const target = next.find((c) => c.status === newStatus);
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

  return (
    <div className="space-y-6">
      <PageHeader title="Lead Pipeline" description="Drag leads across stages">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/${tenantSlug}/leads`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> List
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PageHeader>

      {loading ? (
        <Skeleton className="h-64 w-full" />
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
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <KanbanColumn key={column.status} column={column}>
                <SortableContext
                  items={column.leads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.leads.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => router.push(`/app/${tenantSlug}/leads/${lead.id}`)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="rounded-lg border bg-card p-3 shadow-lg w-[260px]">
                <p className="font-medium text-sm">
                  {activeLead.firstName} {activeLead.lastName}
                </p>
                <LeadStatusBadge status={activeLead.status} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
