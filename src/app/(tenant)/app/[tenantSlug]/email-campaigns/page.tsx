"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Mail, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  INTRODUCTION: "Introduction",
  FOLLOW_UP: "Follow-up",
  PROPOSAL: "Proposal",
  MEETING: "Meeting",
  THANK_YOU: "Thank you",
  OBJECTION: "Objection handling",
  CLOSING: "Closing",
  GREETING: "Greetings",
  BILLING: "Billing & invoices",
  REVIEW: "Reviews & testimonials",
  CUSTOM: "Custom",
};

const CATEGORY_ORDER = [
  "GREETING",
  "INTRODUCTION",
  "FOLLOW_UP",
  "PROPOSAL",
  "MEETING",
  "THANK_YOU",
  "BILLING",
  "REVIEW",
  "OBJECTION",
  "CLOSING",
  "CUSTOM",
];

export default function EmailCampaignsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/email-templates`);
      const json = await res.json();
      setTemplates(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const copyTemplate = (t: EmailTemplate) => {
    const text = `Subject: ${t.subject}\n\n${t.body}`;
    navigator.clipboard.writeText(text);
    toast.success("Template copied to clipboard");
  };

  const grouped = templates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const cat = t.category ?? "CUSTOM";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Campaigns"
        description="Ready-made templates — greetings, billing, reviews, sales outreach, and more"
      >
        <Button variant="ghost" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PageHeader>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4 space-y-6">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates yet. Run database seed to load defaults.
            </p>
          ) : (
            CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
              <div key={cat}>
                <h2 className="font-semibold mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {grouped[cat].map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border bg-card p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                        </div>
                        <Badge variant="outline">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.body}</p>
                      <div className="flex gap-2 mt-auto">
                        <Button size="sm" variant="outline" onClick={() => setPreview(t)}>
                          Preview
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => copyTemplate(t)}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="sequences" className="mt-4">
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Email sequences coming soon — use templates for one-off outreach.</p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Subject:</span> {preview.subject}
              </p>
              <div className="rounded-lg border p-4 whitespace-pre-wrap bg-muted/30">
                {preview.body}
              </div>
              <Button className="w-full" onClick={() => copyTemplate(preview)}>
                <Copy className="h-4 w-4 mr-1" /> Copy template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
