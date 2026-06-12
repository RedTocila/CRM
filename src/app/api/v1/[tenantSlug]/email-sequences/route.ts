import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const stepSchema = z.object({
  order: z.number().int(),
  subject: z.string().min(1),
  body: z.string().min(1),
  delayDays: z.number().int().optional(),
});

const createSequenceSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
  steps: z.array(stepSchema).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.read");
    if (denied) return denied;
    try {
      const sequences = await prisma.emailSequence.findMany({
        where: { companyId },
        include: { steps: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ data: sequences });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "email_campaigns.sequence.create");
    if (denied) return denied;
    try {
      const body = createSequenceSchema.parse(await req.json());
      const { steps, ...sequenceData } = body;
      const sequence = await prisma.emailSequence.create({
        data: {
          ...sequenceData,
          companyId,
          steps: steps
            ? { create: steps.map((s) => ({ ...s, delayDays: s.delayDays ?? 0 })) }
            : undefined,
        },
        include: { steps: true },
      });
      return jsonOk({ data: sequence }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "email_campaigns" }
);
