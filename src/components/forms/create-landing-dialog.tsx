"use client";

import { useState } from "react";
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
import { LANDING_TEMPLATES } from "@/lib/forms/landing-blocks";
import { cn, slugify } from "@/lib/utils";

export function CreateLandingDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { title: string; slug: string; templateId: string }) => void;
  creating?: boolean;
}) {
  const [title, setTitle] = useState("New Landing Page");
  const [slug, setSlug] = useState("");
  const [templateId, setTemplateId] = useState("lead-capture");
  const [slugTouched, setSlugTouched] = useState(false);

  const resolvedSlug = slugTouched ? slugify(slug) : slugify(title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create landing page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Page title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summer promo"
            />
          </div>
          <div>
            <Label>URL slug</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <span>/p/</span>
              <span className="text-foreground">{resolvedSlug || "..."}</span>
            </div>
            <Input
              value={slugTouched ? slug : title}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="summer-promo"
            />
          </div>
          <div>
            <Label>Start from template</Label>
            <div className="grid gap-2 mt-2">
              {LANDING_TEMPLATES.map((t) => (
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
            disabled={!title.trim() || creating}
            onClick={() =>
              onCreate({ title, slug: resolvedSlug, templateId })
            }
          >
            {creating ? "Creating..." : "Create & design"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
