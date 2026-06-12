"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface Plan {
  id: string;
  name: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    planId: "",
    primaryColor: "#2563eb",
    ownerEmail: "",
    ownerName: "",
    ownerPassword: "",
  });

  useEffect(() => {
    fetch("/api/platform/plans")
      .then((r) => r.json())
      .then((d) => {
        const list = d.plans ?? d.data ?? [];
        setPlans(list);
        if (list[0]) setForm((f) => ({ ...f, planId: list[0].id }));
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.planId) {
      toast.error("Select a plan");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/platform/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Failed to create company");
        return;
      }
      toast.success("Company created");
      const company = data.company ?? data.data;
      router.push(company?.id ? `/super-admin/companies/${company.id}` : "/super-admin/companies");
    } catch {
      toast.error("Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/companies"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader title="New Company" description="Create a tenant workspace" />
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plan *</Label>
          <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Primary Color</Label>
          <Input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        </div>

        <div className="border-t pt-5 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Owner (optional)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Owner Email</Label>
              <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner Password</Label>
            <Input type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Company"}</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/super-admin/companies">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
