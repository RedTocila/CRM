import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createFieldSchema = z.object({
  entityType: z.enum(["LEAD", "CONTACT", "DEAL", "COMPANY", "TICKET"]),
  name: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "EMAIL",
    "PHONE",
    "DATE",
    "DROPDOWN",
    "CHECKBOX",
    "MULTI_SELECT",
  ]),
  options: z.record(z.string(), z.unknown()).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.custom_fields.manage_settings");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const entityType = searchParams.get("entityType");
      const fields = await prisma.customFieldDefinition.findMany({
        where: {
          companyId,
          ...(entityType ? { entityType: entityType as never } : {}),
        },
        orderBy: [{ entityType: "asc" }, { sortOrder: "asc" }],
      });
      return jsonOk({ data: fields });
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "settings.custom_fields.manage_settings");
    if (denied) return denied;
    try {
      const body = createFieldSchema.parse(await req.json());
      const field = await prisma.customFieldDefinition.create({
        data: {
          ...body,
          options: body.options as Prisma.InputJsonValue | undefined,
          companyId,
        },
      });
      return jsonOk({ data: field }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  {}
);
