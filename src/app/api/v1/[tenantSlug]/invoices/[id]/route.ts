import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const updateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  subtotal: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  issuedAt: z.coerce.date().optional().nullable(),
  paidAt: z.coerce.date().optional().nullable(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "invoices.invoice.read");
    if (denied) return denied;
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: params.id, companyId },
        include: { lines: true },
      });
      if (!invoice) return jsonError("Invoice not found", 404);
      return jsonOk({ data: invoice });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "invoices" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    const denied = requirePerm(user, "invoices.invoice.update");
    if (denied) return denied;
    try {
      const existing = await prisma.invoice.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Invoice not found", 404);

      const body = updateInvoiceSchema.parse(await req.json());
      const invoice = await prisma.invoice.update({
        where: { id: params.id },
        data: body,
        include: { lines: true },
      });
      return jsonOk({ data: invoice });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "invoices" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "invoices.invoice.delete");
    if (denied) return denied;
    try {
      const existing = await prisma.invoice.findFirst({
        where: { id: params.id, companyId },
      });
      if (!existing) return jsonError("Invoice not found", 404);

      await prisma.invoice.delete({ where: { id: params.id } });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "invoices" }
);
