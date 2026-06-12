"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  limits: { key: string; value: number }[];
  modules: { module: { name: string } }[];
  _count?: { subscriptions: number };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch("/api/platform/plans").then((r) => r.json()).then((d) => setPlans(d.plans ?? d.data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription Plans</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-2xl font-bold">${Number(plan.priceMonthly)}/mo</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{plan._count?.subscriptions ?? 0} subscribers</p>
              <div className="flex flex-wrap gap-1">
                {plan.limits.map((l) => (
                  <Badge key={l.key} variant="secondary">{l.key}: {l.value}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{plan.modules.length} modules included</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
