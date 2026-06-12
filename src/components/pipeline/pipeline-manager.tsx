"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { GripVertical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/utils";

interface PipelineStage {
  id?: string;
  name: string;
  order: number;
  probability?: number;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

function emptyStage(order: number): PipelineStage {
  return { name: "", order, probability: 0 };
}

export function PipelineManager() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { data: session } = useSession();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [form, setForm] = useState({ name: "", isDefault: false, stages: [] as PipelineStage[] });

  const canManage =
    session?.user?.isSuperAdmin || ADMIN_ROLES.has(session?.user?.roleSlug ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/pipeline`);
      const json = await res.json();
      setPipelines(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      isDefault: pipelines.length === 0,
      stages: [
        { name: "Qualification", order: 0, probability: 10 },
        { name: "Proposal", order: 1, probability: 40 },
        { name: "Negotiation", order: 2, probability: 70 },
        { name: "Closed Won", order: 3, probability: 100 },
      ],
    });
    setDialogOpen(true);
  };

  const openEdit = (p: Pipeline) => {
    setEditing(p);
    setForm({
      name: p.name,
      isDefault: p.isDefault,
      stages: p.stages.map((s, i) => ({
        id: s.id,
        name: s.name,
        order: s.order ?? i,
        probability: s.probability ?? 0,
      })),
    });
    setDialogOpen(true);
  };

  const updateStage = (index: number, patch: Partial<PipelineStage>) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addStage = () => {
    setForm((f) => ({
      ...f,
      stages: [...f.stages, emptyStage(f.stages.length)],
    }));
  };

  const removeStage = (index: number) => {
    setForm((f) => ({
      ...f,
      stages: f.stages
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i })),
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }
    if (form.stages.some((s) => !s.name.trim())) {
      toast.error("Every stage needs a title");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        isDefault: form.isDefault,
        stages: form.stages.map((s, i) => ({
          id: s.id,
          name: s.name.trim(),
          order: i,
          probability: s.probability ?? 0,
        })),
      };

      const url = editing
        ? `/api/v1/${tenantSlug}/pipeline/${editing.id}`
        : `/api/v1/${tenantSlug}/pipeline`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(apiErrorMessage(json.error, "Failed to save pipeline"));
        return;
      }
      toast.success(editing ? "Pipeline updated" : "Pipeline created");
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const removePipeline = async (p: Pipeline) => {
    if (!confirm(`Delete pipeline "${p.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/v1/${tenantSlug}/pipeline/${p.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(apiErrorMessage(json.error, "Failed to delete pipeline"));
      return;
    }
    toast.success("Pipeline deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Configure sales pipelines and stage titles"
      >
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add pipeline
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <p className="text-sm">No pipelines yet.</p>
          {canManage && (
            <Button className="mt-4" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first pipeline
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">{p.name}</h2>
                    {p.isDefault && <Badge>Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {p.stages.length} stage{p.stages.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePipeline(p)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {p.stages.map((s) => (
                  <Badge key={s.id ?? s.name} variant="secondary" className="font-normal">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pipeline" : "New pipeline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Pipeline name</Label>
              <Input
                id="pipeline-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sales Pipeline"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border"
              />
              Set as default pipeline
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Stages</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add stage
                </Button>
              </div>
              <div className="space-y-2">
                {form.stages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      value={stage.name}
                      onChange={(e) => updateStage(index, { name: e.target.value })}
                      placeholder={`Stage ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={form.stages.length <= 1}
                      onClick={() => removeStage(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
