import { prisma } from "@/lib/db";
import { MODULE_MANIFESTS } from "./manifests";
import type { ModuleManifest } from "./types";

export async function getEnabledModules(companyId: string): Promise<ModuleManifest[]> {
  const enabled = await prisma.companyModule.findMany({
    where: { companyId, enabled: true },
    include: { module: true },
  });

  const enabledIds = new Set(enabled.map((e) => e.moduleId));
  return MODULE_MANIFESTS.filter((m) => enabledIds.has(m.id)).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export async function isModuleEnabled(companyId: string, moduleId: string): Promise<boolean> {
  const mod = await prisma.companyModule.findUnique({
    where: { companyId_moduleId: { companyId, moduleId } },
  });
  return mod?.enabled ?? false;
}

export async function setModuleEnabled(
  companyId: string,
  moduleId: string,
  enabled: boolean
): Promise<void> {
  await prisma.companyModule.upsert({
    where: { companyId_moduleId: { companyId, moduleId } },
    create: { companyId, moduleId, enabled },
    update: { enabled, enabledAt: enabled ? new Date() : undefined },
  });
}

export function getAllManifests(): ModuleManifest[] {
  return MODULE_MANIFESTS;
}
