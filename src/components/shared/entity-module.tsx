"use client";

import { useParams } from "next/navigation";
import { CrudModulePage } from "@/components/shared/crud-module-page";
import { entityConfigs } from "@/lib/entity-configs";
import { entityColumns } from "@/lib/entity-columns";

export type EntityKey = keyof typeof entityConfigs;

export function EntityModule({ entity }: { entity: EntityKey }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const config = entityConfigs[entity];
  const columns = entityColumns[entity] ?? [{ key: "id", header: "ID" }];

  return (
    <CrudModulePage
      tenantSlug={tenantSlug}
      config={config}
      columns={columns}
      allowDelete={config.allowDelete !== false}
    />
  );
}
