"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface FieldDefinition {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  options?: string[] | null;
}

interface CustomFieldsFormProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}

export function CustomFieldsForm({ fields, values, onChange }: CustomFieldsFormProps) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium">Custom Fields</h3>
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label>{field.label}{field.required && " *"}</Label>
          {field.fieldType === "TEXT" && (
            <Input
              value={String(values[field.id] ?? "")}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            />
          )}
          {field.fieldType === "NUMBER" && (
            <Input
              type="number"
              value={String(values[field.id] ?? "")}
              onChange={(e) => onChange(field.id, parseFloat(e.target.value))}
              required={field.required}
            />
          )}
          {field.fieldType === "DATE" && (
            <Input
              type="date"
              value={String(values[field.id] ?? "")}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            />
          )}
          {field.fieldType === "DROPDOWN" && (
            <Select value={String(values[field.id] ?? "")} onValueChange={(v) => onChange(field.id, v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {(field.options as string[] ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.fieldType === "CHECKBOX" && (
            <Switch
              checked={Boolean(values[field.id])}
              onCheckedChange={(v) => onChange(field.id, v)}
            />
          )}
          {(field.fieldType === "EMAIL" || field.fieldType === "PHONE") && (
            <Input
              type={field.fieldType === "EMAIL" ? "email" : "tel"}
              value={String(values[field.id] ?? "")}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            />
          )}
          {field.fieldType === "MULTI_SELECT" && (
            <Textarea
              value={String(values[field.id] ?? "")}
              onChange={(e) => onChange(field.id, e.target.value.split(",").map((s) => s.trim()))}
              placeholder="Comma-separated values"
            />
          )}
        </div>
      ))}
    </div>
  );
}
