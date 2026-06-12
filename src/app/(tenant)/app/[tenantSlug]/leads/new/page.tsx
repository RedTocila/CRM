"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/leads/constants";
import { toast } from "sonner";

export default function NewLeadPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    company: "",
    website: "",
    industry: "",
    country: "",
    city: "",
    status: "NEW",
    source: "MANUAL_ENTRY",
    priority: "MEDIUM",
    leadValue: "",
    expectedRevenue: "",
    conversionProbability: "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) return toast.error("First name required");
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          leadValue: form.leadValue ? Number(form.leadValue) : null,
          expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : null,
          conversionProbability: form.conversionProbability
            ? Number(form.conversionProbability)
            : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Lead created");
      router.push(`/app/${tenantSlug}/leads/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/app/${tenantSlug}/leads`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>
      <PageHeader title="New Lead" description="Add a prospect to your pipeline" />

      <form onSubmit={submit} className="rounded-xl border bg-card p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value)}
            />
          </div>
          <div>
            <Label>Company</Label>
            <Input value={form.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div>
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Source</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Lead Value</Label>
            <Input
              type="number"
              value={form.leadValue}
              onChange={(e) => set("leadValue", e.target.value)}
            />
          </div>
          <div>
            <Label>Expected Revenue</Label>
            <Input
              type="number"
              value={form.expectedRevenue}
              onChange={(e) => set("expectedRevenue", e.target.value)}
            />
          </div>
          <div>
            <Label>Conversion %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.conversionProbability}
              onChange={(e) => set("conversionProbability", e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Lead"}
        </Button>
      </form>
    </div>
  );
}
