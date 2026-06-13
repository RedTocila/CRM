import { z } from "zod";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManagePipelines } from "@/lib/pipeline/access";
import {
  availableStatusKeysToAdd,
  defaultLabelForStatusKey,
  getKanbanColumns,
  saveKanbanColumns,
} from "@/lib/leads/kanban-columns";

const columnSchema = z.object({
  statusKey: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().min(0),
});

const updateSchema = z.object({
  columns: z.array(columnSchema).min(1),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.read");
    if (denied) return denied;
    try {
      const columns = await getKanbanColumns(companyId);
      const available = availableStatusKeysToAdd(columns);
      return jsonOk({
        data: columns,
        availableToAdd: available.map((statusKey) => ({
          statusKey,
          defaultLabel: defaultLabelForStatusKey(statusKey),
        })),
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);

export const PATCH = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "leads.lead.update");
    if (denied) return denied;
    if (!canManagePipelines(user)) {
      return jsonError("Only CRM admins can edit pipeline stages", 403);
    }
    try {
      const body = updateSchema.parse(await req.json());
      const columns = await saveKanbanColumns(companyId, body.columns);
      const available = availableStatusKeysToAdd(columns);
      return jsonOk({
        data: columns,
        availableToAdd: available.map((statusKey) => ({
          statusKey,
          defaultLabel: defaultLabelForStatusKey(statusKey),
        })),
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        return jsonError(error.message, 400);
      }
      return handleApiError(error);
    }
  },
  { moduleId: "leads" }
);
