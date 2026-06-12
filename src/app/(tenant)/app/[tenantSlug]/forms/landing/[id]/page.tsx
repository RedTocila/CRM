"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingPageBuilder } from "@/components/forms/landing-page-builder";
import { LandingBlockPreview } from "@/components/forms/landing-block-preview";
import type { LandingBlock } from "@/lib/forms/landing-blocks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function LandingBuilderPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [blocks, setBlocks] = useState<LandingBlock[]>([]);
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pageRes, formsRes] = await Promise.all([
        fetch(`/api/v1/${tenantSlug}/landing-pages/${id}`),
        fetch(`/api/v1/${tenantSlug}/forms`),
      ]);
      const pageJson = await pageRes.json();
      const formsJson = await formsRes.json();
      const page = pageJson.data;
      setTitle(page.title);
      setPublished(page.published);
      const content = page.content as { blocks?: LandingBlock[] };
      setBlocks(content?.blocks ?? []);
      setForms((formsJson.data ?? []).map((f: { id: string; name: string }) => ({
        id: f.id,
        name: f.name,
      })));
    } catch {
      toast.error("Failed to load page");
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
      const res = await fetch(`/api/v1/${tenantSlug}/landing-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, published, content: { blocks } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Landing page saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/app/${tenantSlug}/forms?tab=landing`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">Landing Page Builder</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label>Page title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch checked={published} onCheckedChange={setPublished} id="pub" />
          <Label htmlFor="pub">Published</Label>
        </div>
      </div>

      <LandingPageBuilder blocks={blocks} onBlocksChange={setBlocks} forms={forms} />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{title} — Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-background">
            {blocks.length === 0 ? (
              <p className="p-12 text-center text-muted-foreground">No blocks on this page yet.</p>
            ) : (
              blocks.map((block) => (
                <LandingBlockPreview key={block.id} block={block} />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
