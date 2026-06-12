import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "contacts.contact.read");
    if (denied) return denied;
    try {
      const contacts = await prisma.contact.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: contacts });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "contacts" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "contacts.contact.create");
    if (denied) return denied;
    try {
      const body = createContactSchema.parse(await req.json());
      const contact = await prisma.contact.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email || null,
          phone: body.phone,
          company: body.company,
          title: body.title,
          companyId,
          createdById: user.id,
        },
      });
      return jsonOk({ data: contact }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "contacts", checkLimit: "contacts" }
);
