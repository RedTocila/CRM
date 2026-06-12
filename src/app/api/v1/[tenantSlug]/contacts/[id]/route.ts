import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "contacts.contact.read");
    if (denied) return denied;
    try {
      const contact = await prisma.contact.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
        include: { tags: true, notes: true },
      });
      if (!contact) return jsonError("Contact not found", 404);
      return jsonOk({ data: contact });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "contacts" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "contacts.contact.update");
    if (denied) return denied;
    try {
      const existing = await prisma.contact.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Contact not found", 404);

      const body = updateContactSchema.parse(await req.json());
      const contact = await prisma.contact.update({
        where: { id: params.id },
        data: {
          ...body,
          email: body.email === "" ? null : body.email,
        },
      });
      return jsonOk({ data: contact });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "contacts" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "contacts.contact.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.contact.findFirst({
        where: { id: params.id, companyId, deletedAt: null },
      });
      if (!existing) return jsonError("Contact not found", 404);

      await prisma.contact.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "contacts" }
);
