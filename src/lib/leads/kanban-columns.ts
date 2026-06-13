import { prisma } from "@/lib/db";
import {
  KANBAN_STATUSES,
  LEAD_STATUSES,
  LOST_STATUSES,
  STATUS_LABELS,
  type LeadStatusValue,
} from "./constants";
import { LOST_BUCKET_KEY } from "./kanban-constants";

export { LOST_BUCKET_KEY };

export type KanbanColumnConfig = {
  id?: string;
  statusKey: string;
  label: string;
  order: number;
};

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
  ...KANBAN_STATUSES.map((statusKey, order) => ({
    statusKey,
    label: STATUS_LABELS[statusKey] ?? statusKey,
    order,
  })),
  {
    statusKey: LOST_BUCKET_KEY,
    label: "Lost / Closed",
    order: KANBAN_STATUSES.length,
  },
];

const VALID_STATUS_KEYS = new Set<string>([...LEAD_STATUSES, LOST_BUCKET_KEY]);

export function isValidKanbanStatusKey(key: string): boolean {
  return VALID_STATUS_KEYS.has(key);
}

export function defaultLabelForStatusKey(statusKey: string): string {
  if (statusKey === LOST_BUCKET_KEY) return "Lost / Closed";
  return STATUS_LABELS[statusKey] ?? statusKey.replace(/_/g, " ");
}

export function leadsForKanbanColumn<T extends { status: string }>(
  leads: T[],
  statusKey: string
): T[] {
  if (statusKey === LOST_BUCKET_KEY) {
    return leads.filter((l) => LOST_STATUSES.includes(l.status as LeadStatusValue));
  }
  return leads.filter((l) => l.status === statusKey);
}

export async function getKanbanColumns(companyId: string): Promise<KanbanColumnConfig[]> {
  const rows = await prisma.leadKanbanColumn.findMany({
    where: { companyId },
    orderBy: { order: "asc" },
  });

  if (rows.length === 0) {
    return ensureKanbanColumns(companyId);
  }

  return rows.map((r) => ({
    id: r.id,
    statusKey: r.statusKey,
    label: r.label,
    order: r.order,
  }));
}

export async function ensureKanbanColumns(companyId: string): Promise<KanbanColumnConfig[]> {
  const existing = await prisma.leadKanbanColumn.count({ where: { companyId } });
  if (existing > 0) {
    return getKanbanColumns(companyId);
  }

  await prisma.leadKanbanColumn.createMany({
    data: DEFAULT_KANBAN_COLUMNS.map((col) => ({
      companyId,
      statusKey: col.statusKey,
      label: col.label,
      order: col.order,
    })),
  });

  const rows = await prisma.leadKanbanColumn.findMany({
    where: { companyId },
    orderBy: { order: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    statusKey: r.statusKey,
    label: r.label,
    order: r.order,
  }));
}

export function availableStatusKeysToAdd(current: KanbanColumnConfig[]): string[] {
  const used = new Set(current.map((c) => c.statusKey));
  return [...LEAD_STATUSES, LOST_BUCKET_KEY].filter((key) => !used.has(key));
}

export async function saveKanbanColumns(
  companyId: string,
  columns: KanbanColumnConfig[]
): Promise<KanbanColumnConfig[]> {
  const normalized = columns
    .map((col, index) => ({
      statusKey: col.statusKey,
      label: col.label.trim(),
      order: index,
    }))
    .filter((col) => col.label.length > 0);

  if (normalized.length === 0) {
    throw new Error("At least one stage is required");
  }

  const keys = normalized.map((c) => c.statusKey);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Duplicate stage keys");
  }

  for (const col of normalized) {
    if (!isValidKanbanStatusKey(col.statusKey)) {
      throw new Error(`Invalid stage key: ${col.statusKey}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.leadKanbanColumn.deleteMany({ where: { companyId } });
    await tx.leadKanbanColumn.createMany({
      data: normalized.map((col) => ({
        companyId,
        statusKey: col.statusKey,
        label: col.label,
        order: col.order,
      })),
    });
  });

  return getKanbanColumns(companyId);
}
