"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingBlockPreview } from "@/components/forms/landing-block-preview";
import { LandingBlockEditor } from "@/components/forms/landing-block-editor";
import {
  PALETTE_BLOCKS,
  createLandingBlock,
  type LandingBlock,
  type LandingBlockType,
} from "@/lib/forms/landing-blocks";
import { cn } from "@/lib/utils";

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function PaletteItem({
  type,
  label,
  description,
}: {
  type: LandingBlockType;
  label: string;
  description: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: "palette", blockType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-sm transition-all",
        isDragging && "opacity-40"
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SortableCanvasBlock({
  block,
  selected,
  onSelect,
  onRemove,
}: {
  block: LandingBlock;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { source: "canvas" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          className="p-1 rounded border bg-background shadow-sm cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <LandingBlockPreview block={block} selected={selected} onSelect={onSelect} />
    </div>
  );
}

function CanvasDropZone({
  blocks,
  selectedId,
  onSelect,
  onRemove,
}: {
  blocks: LandingBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[480px] rounded-xl border-2 border-dashed bg-background transition-colors pl-10",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
      )}
    >
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[480px] text-center p-8">
          <p className="font-medium text-muted-foreground">Drag blocks here</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Pull sections from the left panel onto this canvas
          </p>
        </div>
      ) : (
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y">
            {blocks.map((block) => (
              <SortableCanvasBlock
                key={block.id}
                block={block}
                selected={selectedId === block.id}
                onSelect={() => onSelect(block.id)}
                onRemove={() => onRemove(block.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

interface FormOption {
  id: string;
  name: string;
}

export function LandingPageBuilder({
  blocks,
  onBlocksChange,
  forms = [],
}: {
  blocks: LandingBlock[];
  onBlocksChange: (blocks: LandingBlock[]) => void;
  forms?: FormOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [activePalette, setActivePalette] = useState<{
    type: LandingBlockType;
    label: string;
  } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId]
  );

  const updateBlock = (id: string, patch: Partial<LandingBlock>) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    onBlocksChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.source === "palette") {
      const meta = PALETTE_BLOCKS.find((p) => p.type === data.blockType);
      setActivePalette({ type: data.blockType, label: meta?.label ?? "Block" });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePalette(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.source === "palette") {
      const blockType = activeData.blockType as LandingBlockType;
      const newBlock = createLandingBlock(blockType);

      if (over.id === "canvas") {
        onBlocksChange([...blocks, newBlock]);
      } else {
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        if (overIndex >= 0) {
          const next = [...blocks];
          next.splice(overIndex, 0, newBlock);
          onBlocksChange(next);
        } else {
          onBlocksChange([...blocks, newBlock]);
        }
      }
      setSelectedId(newBlock.id);
      return;
    }

    if (active.id !== over.id && activeData?.source === "canvas") {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4 min-h-[560px]">
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Blocks</h3>
            <p className="text-xs text-muted-foreground">Drag onto canvas</p>
          </div>
          <div className="h-[500px] overflow-y-auto p-3 space-y-2">
            {PALETTE_BLOCKS.map((item) => (
              <PaletteItem
                key={item.type}
                type={item.type}
                label={item.label}
                description={item.description}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Canvas</h3>
            <p className="text-xs text-muted-foreground">Click a block to edit</p>
          </div>
          <CanvasDropZone
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={removeBlock}
          />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Properties</h3>
          </div>
          <div className="h-[500px] overflow-y-auto p-4">
            {selectedBlock ? (
              <LandingBlockEditor
                block={selectedBlock}
                forms={forms}
                onChange={(patch) => updateBlock(selectedBlock.id, patch)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a block on the canvas to edit its content.
              </p>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activePalette ? (
          <div className="rounded-lg border bg-card p-3 shadow-lg opacity-90">
            <p className="text-sm font-medium">{activePalette.label}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
