import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().optional(),
  unitPrice: z.coerce.number(),
  total: z.coerce.number().optional(),
});

const createInvoiceSchema = z.object({
  number: z.string().min(1),
  contactName: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  subtotal: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  total: z.coerce.number().optional(),
  dueDate: z.coerce.date().optional(),
  lines: z.array(lineSchema).optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "invoices.invoice.read");
    if (denied) return denied;
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const invoices = await prisma.invoice.findMany({
        where: {
          companyId,
          ...(status ? { status: status as never } : {}),
        },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: invoices });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "invoices" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "invoices.invoice.create");
    if (denied) return denied;
    try {
      const body = createInvoiceSchema.parse(await req.json());
      const { lines, ...invoiceData } = body;
      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          subtotal: invoiceData.subtotal ?? 0,
          tax: invoiceData.tax ?? 0,
          total: invoiceData.total ?? 0,
          companyId,
          lines: lines
            ? {
                create: lines.map((line) => ({
                  description: line.description,
                  quantity: line.quantity ?? 1,
                  unitPrice: line.unitPrice,
                  total: line.total ?? line.unitPrice * (line.quantity ?? 1),
                })),
              }
            : undefined,
        },
        include: { lines: true },
      });
      return jsonOk({ data: invoice }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "invoices" }
);
