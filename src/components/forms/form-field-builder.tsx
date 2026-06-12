"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_TYPES, type FormFieldDef, type FormFieldType } from "@/lib/forms/form-fields";

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SortableFieldRow({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: FormFieldDef;
  index: number;
  onUpdate: (patch: Partial<FormFieldDef>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="flex-1"
          placeholder="Field label"
        />
        <Select
          value={field.type}
          onValueChange={(v) => onUpdate({ type: v as FormFieldType })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="flex items-center gap-4 pl-10">
        <div className="flex items-center gap-2">
          <Switch
            checked={!!field.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
            id={`req-${field.id}`}
          />
          <Label htmlFor={`req-${field.id}`}>Required</Label>
        </div>
        <Input
          value={field.placeholder ?? ""}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          placeholder="Placeholder text"
          className="flex-1"
        />
      </div>
      {field.type === "select" && (
        <div className="pl-10">
          <Label className="text-xs">Options (comma separated)</Label>
          <Input
            value={(field.options ?? []).join(", ")}
            onChange={(e) =>
              onUpdate({
                options: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Option A, Option B"
          />
        </div>
      )}
    </div>
  );
}

export function FormFieldBuilder({
  fields,
  onChange,
}: {
  fields: FormFieldDef[];
  onChange: (fields: FormFieldDef[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const addField = (type: FormFieldType = "text") => {
    onChange([
      ...fields,
      {
        id: `field-${Date.now()}`,
        type,
        label: "New field",
        required: false,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<FormFieldDef>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(fields, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Fields</h2>
        <div className="flex gap-2">
          {(["text", "email", "phone", "textarea"] as FormFieldType[]).map((t) => (
            <Button key={t} size="sm" variant="outline" onClick={() => addField(t)}>
              <Plus className="h-3 w-3 mr-1" /> {t}
            </Button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No fields yet. Add fields above or drag to reorder once added.
              </div>
            )}
            {fields.map((field, index) => (
              <SortableFieldRow
                key={field.id}
                field={field}
                index={index}
                onUpdate={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
