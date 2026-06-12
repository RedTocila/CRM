"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function SettingsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({ displayName: "", primaryColor: "#2563eb", logoUrl: "" });
  const [customFields, setCustomFields] = useState<{ id: string; label: string; entityType: string; fieldType: string }[]>([]);
  const [newField, setNewField] = useState({ label: "", entityType: "LEAD", fieldType: "TEXT" });

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/${tenantSlug}/settings`).then((r) => r.json()),
      fetch(`/api/v1/${tenantSlug}/custom-fields`).then((r) => r.json()),
    ]).then(([settingsRes, fieldsRes]) => {
      const company = settingsRes.data;
      if (company) {
        setBranding({
          displayName: company.displayName ?? company.name ?? "",
          primaryColor: company.primaryColor ?? "#2563eb",
          logoUrl: company.logoUrl ?? "",
        });
      }
      setCustomFields(fieldsRes.data ?? []);
      setLoading(false);
    });
  }, [tenantSlug]);

  const saveBranding = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (!res.ok) {
        toast.error("Failed to save branding");
        return;
      }
      toast.success("Branding saved");
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = async () => {
    if (!newField.label.trim()) return;
    const res = await fetch(`/api/v1/${tenantSlug}/custom-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newField,
        name: (newField.label || "field").toLowerCase().replace(/\s+/g, "_"),
      }),
    });
    if (!res.ok) {
      toast.error("Failed to add field");
      return;
    }
    toast.success("Custom field added");
    setNewField({ label: "", entityType: "LEAD", fieldType: "TEXT" });
    const fieldsRes = await fetch(`/api/v1/${tenantSlug}/custom-fields`);
    const d = await fieldsRes.json();
    setCustomFields(d.data ?? []);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Company Settings" description="Customize branding, fields, and automations" />

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">White Label</TabsTrigger>
          <TabsTrigger value="fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <Card className="glass-card border-0 shadow-none">
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={branding.displayName}
                  onChange={(e) => setBranding({ ...branding, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    className="w-14 h-10 p-1 cursor-pointer"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={branding.logoUrl}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={saveBranding} disabled={saving}>
                {saving ? "Saving..." : "Save Branding"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="mt-6">
          <Card className="glass-card border-0 shadow-none">
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom fields yet.</p>
              ) : (
                customFields.map((f) => (
                  <div key={f.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">{f.entityType} · {f.fieldType}</span>
                  </div>
                ))
              )}
              <div className="grid gap-3 pt-4 border-t">
                <Input
                  placeholder="Field label"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newField.entityType} onValueChange={(v) => setNewField({ ...newField, entityType: v })}>
                    <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
                    <SelectContent>
                      {["LEAD", "CONTACT", "DEAL", "TASK", "TICKET"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newField.fieldType} onValueChange={(v) => setNewField({ ...newField, fieldType: v })}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addCustomField}>Add Field</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <Card className="glass-card border-0 shadow-none">
            <CardHeader>
              <CardTitle>Workflow Automations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Automations trigger on events like lead created, deal moved, or task completed.
              </p>
              <Button asChild variant="outline">
                <a href={`/app/${tenantSlug}/settings/automations`}>Manage Automations</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
