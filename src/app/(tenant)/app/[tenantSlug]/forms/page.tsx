"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FileText, Layout, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateFormDialog, fieldsFromTemplate } from "@/components/forms/create-form-dialog";
import { CreateLandingDialog } from "@/components/forms/create-landing-dialog";
import { blocksFromTemplate } from "@/lib/forms/landing-blocks";
import { toast } from "sonner";

interface FormRow {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  updatedAt?: string;
}

interface LandingRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt?: string;
}

export default function FormsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "landing" ? "landing" : "forms";

  const [forms, setForms] = useState<FormRow[]>([]);
  const [pages, setPages] = useState<LandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [landingDialogOpen, setLandingDialogOpen] = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const [creatingLanding, setCreatingLanding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [formsRes, pagesRes] = await Promise.all([
        fetch(`/api/v1/${tenantSlug}/forms`),
        fetch(`/api/v1/${tenantSlug}/landing-pages`),
      ]);
      const formsJson = await formsRes.json();
      const pagesJson = await pagesRes.json();
      setForms(formsJson.data ?? []);
      setPages(pagesJson.data ?? []);
    } catch {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateForm = async ({
    name,
    description,
    templateId,
  }: {
    name: string;
    description: string;
    templateId: string;
  }) => {
    setCreatingForm(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          fields: fieldsFromTemplate(templateId),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create form");
      toast.success("Form created");
      setFormDialogOpen(false);
      router.push(`/app/${tenantSlug}/forms/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create form");
    } finally {
      setCreatingForm(false);
    }
  };

  const handleCreateLanding = async ({
    title,
    slug,
    templateId,
  }: {
    title: string;
    slug: string;
    templateId: string;
  }) => {
    setCreatingLanding(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/landing-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content: { blocks: blocksFromTemplate(templateId) },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create page");
      toast.success("Landing page created");
      setLandingDialogOpen(false);
      router.push(`/app/${tenantSlug}/forms/landing/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setCreatingLanding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms & Landing Pages"
        description="Build lead capture forms and drag-and-drop landing pages"
      >
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PageHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="forms">
            <FileText className="h-4 w-4 mr-2" /> Forms
          </TabsTrigger>
          <TabsTrigger value="landing">
            <Layout className="h-4 w-4 mr-2" /> Landing Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Create forms with drag-and-drop fields for lead capture.
            </p>
            <Button size="sm" onClick={() => setFormDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Form
            </Button>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : forms.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center space-y-4">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">No forms yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start with a template or build from scratch.
                </p>
              </div>
              <Button onClick={() => setFormDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first form
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card divide-y">
              {forms.map((f) => (
                <Link
                  key={f.id}
                  href={`/app/${tenantSlug}/forms/${f.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">{f.name}</p>
                    {f.description && (
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    )}
                  </div>
                  <Badge variant={f.isActive ? "default" : "secondary"}>
                    {f.isActive ? "Active" : "Draft"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="landing" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Design pages visually — drag blocks, no code required.
            </p>
            <Button size="sm" onClick={() => setLandingDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Landing Page
            </Button>
          </div>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : pages.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center space-y-4">
              <Layout className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">No landing pages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick a template and customize with drag and drop.
                </p>
              </div>
              <Button onClick={() => setLandingDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first page
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card divide-y">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/${tenantSlug}/forms/landing/${p.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                  <Badge variant={p.published ? "default" : "secondary"}>
                    {p.published ? "Published" : "Draft"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onCreate={handleCreateForm}
        creating={creatingForm}
      />
      <CreateLandingDialog
        open={landingDialogOpen}
        onOpenChange={setLandingDialogOpen}
        onCreate={handleCreateLanding}
        creating={creatingLanding}
      />
    </div>
  );
}
