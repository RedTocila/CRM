"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LandingBlock } from "@/lib/forms/landing-blocks";
import { Plus, Trash2 } from "lucide-react";

interface FormOption {
  id: string;
  name: string;
}

export function LandingBlockEditor({
  block,
  forms,
  onChange,
}: {
  block: LandingBlock;
  forms: FormOption[];
  onChange: (patch: Partial<LandingBlock>) => void;
}) {
  const alignment = (
    <div>
      <Label>Alignment</Label>
      <Select
        value={block.alignment ?? "center"}
        onValueChange={(v) => onChange({ alignment: v as LandingBlock["alignment"] })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {block.type} block
      </p>

      {block.type === "hero" && (
        <>
          <div>
            <Label>Headline</Label>
            <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea
              value={block.subtitle ?? ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>Background color</Label>
            <Input
              type="color"
              value={block.bgColor ?? "#f8fafc"}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-10"
            />
          </div>
          {alignment}
        </>
      )}

      {block.type === "text" && (
        <>
          <div>
            <Label>Content</Label>
            <Textarea
              value={block.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
              rows={6}
            />
          </div>
          {alignment}
        </>
      )}

      {block.type === "image" && (
        <>
          <div>
            <Label>Image URL</Label>
            <Input
              value={block.imageUrl ?? ""}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Alt text</Label>
            <Input
              value={block.imageAlt ?? ""}
              onChange={(e) => onChange({ imageAlt: e.target.value })}
            />
          </div>
          <div>
            <Label>Caption</Label>
            <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          {alignment}
        </>
      )}

      {block.type === "cta" && (
        <>
          <div>
            <Label>Heading</Label>
            <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div>
            <Label>Button text</Label>
            <Input
              value={block.buttonText ?? ""}
              onChange={(e) => onChange({ buttonText: e.target.value })}
            />
          </div>
          <div>
            <Label>Button link</Label>
            <Input
              value={block.buttonUrl ?? ""}
              onChange={(e) => onChange({ buttonUrl: e.target.value })}
            />
          </div>
          <div>
            <Label>Background color</Label>
            <Input
              type="color"
              value={block.bgColor ?? "#2563eb"}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-10"
            />
          </div>
          {alignment}
        </>
      )}

      {block.type === "features" && (
        <>
          <div>
            <Label>Section title</Label>
            <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          {(block.items ?? []).map((item, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Feature {i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    onChange({ items: (block.items ?? []).filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={item.title}
                onChange={(e) => {
                  const items = [...(block.items ?? [])];
                  items[i] = { ...items[i], title: e.target.value };
                  onChange({ items });
                }}
                placeholder="Title"
              />
              <Input
                value={item.description}
                onChange={(e) => {
                  const items = [...(block.items ?? [])];
                  items[i] = { ...items[i], description: e.target.value };
                  onChange({ items });
                }}
                placeholder="Description"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              onChange({
                items: [
                  ...(block.items ?? []),
                  { title: "New feature", description: "Description" },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Add feature
          </Button>
          {alignment}
        </>
      )}

      {block.type === "testimonial" && (
        <>
          <div>
            <Label>Quote</Label>
            <Textarea
              value={block.quote ?? ""}
              onChange={(e) => onChange({ quote: e.target.value })}
              rows={4}
            />
          </div>
          <div>
            <Label>Author</Label>
            <Input value={block.author ?? ""} onChange={(e) => onChange({ author: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={block.role ?? ""} onChange={(e) => onChange({ role: e.target.value })} />
          </div>
          {alignment}
        </>
      )}

      {block.type === "form" && (
        <>
          <div>
            <Label>Section title</Label>
            <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input
              value={block.subtitle ?? ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
            />
          </div>
          <div>
            <Label>Linked form</Label>
            <Select
              value={block.formId ?? "default"}
              onValueChange={(v) => onChange({ formId: v === "default" ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Default form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default lead form</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {block.type === "spacer" && (
        <div>
          <Label>Height (px)</Label>
          <Input
            type="number"
            min={8}
            max={200}
            value={block.height ?? 48}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
