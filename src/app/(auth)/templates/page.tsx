import Link from "next/link";
import { CRM_TEMPLATES, TEMPLATE_PASSWORD } from "@/lib/crm-templates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="min-h-screen auth-gradient">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <Link
              href="/login"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Industry CRM Templates</h1>
            <p className="mt-2 text-muted-foreground max-w-xl">
              Three ready-to-go workspaces with pipelines, sample contacts, and realistic demo data.
              Sign in with the credentials below to explore each template.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CRM_TEMPLATES.map((template) => (
            <div
              key={template.slug}
              className="glass-card rounded-2xl p-6 flex flex-col transition-transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-lg shrink-0"
                  style={{ backgroundColor: template.primaryColor }}
                >
                  {template.industry[0]}
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {template.industry}
                </Badge>
              </div>
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{template.description}</p>
              <ul className="mt-4 space-y-1.5">
                {template.highlights.map((h) => (
                  <li key={h} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs space-y-1 font-mono">
                <p>
                  <span className="text-muted-foreground">Email:</span> {template.ownerEmail}
                </p>
                <p>
                  <span className="text-muted-foreground">Password:</span> {TEMPLATE_PASSWORD}
                </p>
              </div>
              <Button asChild className="mt-5 w-full">
                <Link href="/login">
                  Sign in to explore
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          First time? Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run db:seed</code> to create
          all template workspaces and sample data.
        </p>
      </div>
    </div>
  );
}
