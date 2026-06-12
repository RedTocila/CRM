"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FormFieldBuilder } from "@/components/forms/form-field-builder";
import type { FormFieldDef } from "@/lib/forms/form-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function FormPreview({ fields }: { fields: FormFieldDef[] }) {
  return (
    <div className="max-w-md mx-auto space-y-4 p-6">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={field.placeholder}
              disabled
            />
          ) : field.type === "select" ? (
            <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" disabled>
              <option>{field.placeholder ?? "Select..."}</option>
              {(field.options ?? []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder={field.placeholder}
              disabled
            />
          )}
        </div>
      ))}
      <Button className="w-full" disabled>
        Submit
      </Button>
    </div>
  );
}

export default function FormBuilderPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/forms/${id}`);
      const json = await res.json();
      const form = json.data;
      setName(form.name);
      setDescription(form.description ?? "");
      setIsActive(form.isActive);
      const raw = form.fields;
      setFields(Array.isArray(raw) ? raw : []);
    } catch {
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/forms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive, fields }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Form saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/app/${tenantSlug}/forms`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold flex-1">Form Builder</h1>
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <Label>Form name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
          <Label htmlFor="active">Active (accepting submissions)</Label>
        </div>
      </div>

      <FormFieldBuilder fields={fields} onChange={setFields} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{name} — Preview</DialogTitle>
          </DialogHeader>
          <FormPreview fields={fields} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
