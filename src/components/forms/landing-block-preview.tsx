"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LandingBlock } from "@/lib/forms/landing-blocks";
import { cn } from "@/lib/utils";
import { ImageIcon, Star } from "lucide-react";

export function LandingBlockPreview({
  block,
  selected,
  onSelect,
}: {
  block: LandingBlock;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const align = block.alignment ?? "center";
  const alignClass =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
      className={cn(
        "w-full transition-all cursor-pointer outline-none",
        selected && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
    >
      {block.type === "hero" && (
        <div
          className={cn("flex flex-col gap-3 px-8 py-14 rounded-lg", alignClass)}
          style={{ backgroundColor: block.bgColor ?? "#f8fafc" }}
        >
          <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
          <p className="text-muted-foreground max-w-xl text-lg">{block.subtitle}</p>
        </div>
      )}

      {block.type === "text" && (
        <div className={cn("px-8 py-8 flex flex-col", alignClass)}>
          <p className="text-base leading-relaxed max-w-2xl whitespace-pre-wrap">{block.body}</p>
        </div>
      )}

      {block.type === "image" && (
        <div className={cn("px-8 py-8 flex flex-col gap-3", alignClass)}>
          <div className="w-full max-w-lg aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {block.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.imageUrl} alt={block.imageAlt ?? ""} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
          {block.title && <p className="text-sm text-muted-foreground">{block.title}</p>}
        </div>
      )}

      {block.type === "cta" && (
        <div
          className={cn("px-8 py-12 flex flex-col gap-4 rounded-lg", alignClass)}
          style={{ backgroundColor: block.bgColor ?? "#2563eb", color: "#fff" }}
        >
          <h3 className="text-2xl font-semibold">{block.title}</h3>
          <Button variant="secondary" size="lg" className="pointer-events-none">
            {block.buttonText ?? "Get started"}
          </Button>
        </div>
      )}

      {block.type === "features" && (
        <div className="px-8 py-10 space-y-8">
          {block.title && (
            <h3 className={cn("text-xl font-semibold", align === "center" && "text-center")}>
              {block.title}
            </h3>
          )}
          <div className="grid gap-6 sm:grid-cols-3">
            {(block.items ?? []).map((item, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
                <Star className="h-5 w-5 text-primary" />
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === "testimonial" && (
        <div className={cn("px-8 py-10 flex flex-col gap-4", alignClass)}>
          <blockquote className="text-lg italic max-w-xl">&ldquo;{block.quote}&rdquo;</blockquote>
          <div>
            <p className="font-medium">{block.author}</p>
            <p className="text-sm text-muted-foreground">{block.role}</p>
          </div>
        </div>
      )}

      {block.type === "form" && (
        <div className="px-8 py-10">
          <div className="max-w-md mx-auto rounded-xl border bg-card p-6 space-y-4 shadow-sm">
            {block.title && <h3 className="font-semibold text-lg">{block.title}</h3>}
            {block.subtitle && <p className="text-sm text-muted-foreground">{block.subtitle}</p>}
            <Input placeholder="Full name" disabled className="pointer-events-none" />
            <Input placeholder="Email" disabled className="pointer-events-none" />
            <Button className="w-full pointer-events-none">Submit</Button>
          </div>
        </div>
      )}

      {block.type === "spacer" && (
        <div style={{ height: block.height ?? 48 }} className="bg-muted/20 border border-dashed rounded" />
      )}
    </div>
  );
}
