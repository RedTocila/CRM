"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Deal {
  id: string;
  title: string;
  value: number;
  stageId: string | null;
  status: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  deals: Deal[];
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="font-medium text-sm">{deal.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(deal.value)}</p>
    </div>
  );
}

function StageColumn({ stage, children }: { stage: Stage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="min-w-[300px] flex-shrink-0 flex flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50 rounded-t-xl">
        <h3 className="text-sm font-semibold">{stage.name}</h3>
        <Badge variant="secondary">{stage.deals.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-2 min-h-[200px] transition-colors rounded-b-xl ${isOver ? "bg-primary/5 ring-2 ring-primary/20 ring-inset" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: "", value: "0" });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, pipelineRes] = await Promise.all([
        fetch(`/api/v1/${tenantSlug}/deals`),
        fetch(`/api/v1/${tenantSlug}/pipeline`),
      ]);
      const dealsData = await dealsRes.json();
      const pipelineData = await pipelineRes.json();
      const deals: Deal[] = dealsData.data ?? [];
      const pipelines = pipelineData.data ?? [];
      const defaultPipeline = pipelines.find((p: { isDefault: boolean }) => p.isDefault) ?? pipelines[0];

      if (!defaultPipeline?.stages) {
        setStages([]);
        return;
      }

      setStages(
        defaultPipeline.stages.map((stage: Stage) => ({
          ...stage,
          deals: deals.filter((d) => d.stageId === stage.id),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const dealId = active.id as string;
    let stageId = over.id as string;

    if (!stages.some((s) => s.id === stageId)) {
      const overDeal = stages.flatMap((s) => s.deals).find((d) => d.id === stageId);
      if (overDeal) {
        stageId = overDeal.stageId ?? stageId;
      } else {
        return;
      }
    }

    if (!stages.some((s) => s.id === stageId)) return;

    await fetch(`/api/v1/${tenantSlug}/deals/${dealId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    load();
  };

  const createDeal = async () => {
    if (!newDeal.title.trim()) return;
    setSaving(true);
    const firstStage = stages[0];
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDeal.title,
          value: Number(newDeal.value) || 0,
          stageId: firstStage?.id,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create deal");
        return;
      }
      toast.success("Deal created");
      setDialogOpen(false);
      setNewDeal({ title: "", value: "0" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deals Pipeline" description="Drag deals between stages to update progress">
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-[300px] rounded-xl" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          No pipeline configured. Set up a pipeline first.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => {
            const deal = stages.flatMap((s) => s.deals).find((d) => d.id === e.active.id);
            setActiveDeal(deal ?? null);
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <StageColumn key={stage.id} stage={stage}>
                <SortableContext items={stage.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  {stage.deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </SortableContext>
              </StageColumn>
            ))}
          </div>
          <DragOverlay>
            {activeDeal && (
              <div className="rounded-lg border bg-card p-3 shadow-xl rotate-2">
                <p className="font-medium text-sm">{activeDeal.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createDeal} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
