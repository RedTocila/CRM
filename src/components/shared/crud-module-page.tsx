"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import type { EntityConfig } from "@/lib/entity-configs";
import { apiErrorMessage, formatLabel } from "@/lib/utils";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "textarea" | "select" | "date" | "datetime-local";
  required?: boolean;
  options?: string[];
  defaultValue?: string | number;
}

interface CrudModulePageProps {
  tenantSlug: string;
  config: EntityConfig;
  columns: Column<Record<string, unknown> & { id: string }>[];
  allowDelete?: boolean;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />;
  }
  if (field.type === "select" && field.options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
        <SelectContent>
          {field.options.filter(Boolean).map((opt) => (
            <SelectItem key={opt} value={opt}>{formatLabel(opt)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={field.type === "number" ? "number" : field.type === "date" || field.type === "datetime-local" ? field.type : field.type === "email" ? "email" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

export function CrudModulePage({ tenantSlug, config, columns, allowDelete = true }: CrudModulePageProps) {
  const apiPath = `/api/v1/${tenantSlug}/${config.apiSegment}`;
  const [data, setData] = useState<(Record<string, unknown> & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const defaultForm = useCallback(() => {
    const init: Record<string, string> = {};
    for (const f of config.fields) {
      init[f.name] = String(f.defaultValue ?? "");
    }
    return init;
  }, [config.fields]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath);
      const json = await res.json();
      if (!res.ok) {
        setError(apiErrorMessage(json.error, "Failed to load data"));
        setData([]);
        return;
      }
      setData(json.data ?? []);
    } catch {
      setError("Network error");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of config.fields) {
        const raw = form[f.name];
        if (!raw && !f.required) continue;
        if (f.type === "number") payload[f.name] = Number(raw) || 0;
        else if (f.type === "datetime-local" || f.type === "date") {
          payload[f.name] = raw ? new Date(raw).toISOString() : undefined;
        } else payload[f.name] = raw || undefined;
      }

      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Failed to create");
        return;
      }
      toast.success(`${config.createLabel} created`);
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const actionColumns: Column<Record<string, unknown> & { id: string }>[] = allowDelete
    ? [
        ...columns,
        {
          key: "actions",
          header: "",
          render: (row) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ),
        },
      ]
    : columns;

  return (
    <div className="space-y-6">
      <PageHeader title={config.title} description={config.description}>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {config.createLabel}
        </Button>
      </PageHeader>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">Check module access and permissions</p>
            <Button variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
          </div>
        ) : (
          <div className="p-1">
            <DataTable columns={actionColumns} data={data} emptyMessage={`No ${config.title.toLowerCase()} yet. Create your first one.`} />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.createLabel}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {config.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}{field.required && " *"}</Label>
                <FieldInput
                  field={field}
                  value={form[field.name] ?? ""}
                  onChange={(v) => setForm({ ...form, [field.name]: v })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
