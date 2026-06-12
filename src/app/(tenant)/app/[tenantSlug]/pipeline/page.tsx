"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function PipelinePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [pipelines, setPipelines] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/${tenantSlug}/pipeline`)
      .then((r) => r.json())
      .then((d) => setPipelines(d.data ?? []))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline" description="Sales pipeline configuration and stages" />
      <div className="glass-card rounded-xl overflow-hidden p-1">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <DataTable
            columns={[
              { key: "name", header: "Pipeline" },
              { key: "isDefault", header: "Default", render: (r) => (
                <Badge variant={r.isDefault ? "default" : "secondary"}>{r.isDefault ? "Yes" : "No"}</Badge>
              )},
              { key: "stages", header: "Stages", render: (r) => {
                const stages = r.stages as { name: string }[] | undefined;
                return stages?.map((s) => s.name).join(" → ") ?? "—";
              }},
            ]}
            data={pipelines as (Record<string, unknown> & { id: string })[]}
            emptyMessage="No pipelines configured"
          />
        )}
      </div>
    </div>
  );
}
