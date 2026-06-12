"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FORM_TEMPLATES, fieldsFromTemplate } from "@/lib/forms/form-fields";
import { cn } from "@/lib/utils";

export function CreateFormDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; description: string; templateId: string }) => void;
  creating?: boolean;
}) {
  const [name, setName] = useState("New Form");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("lead");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create form</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Form name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this form for?"
            />
          </div>
          <div>
            <Label>Start from template</Label>
            <div className="grid gap-2 mt-2">
              {FORM_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                    templateId === t.id && "border-primary bg-primary/5"
                  )}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  {t.fields.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.fields.length} fields included
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || creating}
            onClick={() => onCreate({ name, description, templateId })}
          >
            {creating ? "Creating..." : "Create & edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { fieldsFromTemplate };
