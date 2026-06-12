import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";

const sendWhatsAppSchema = z.object({
  to: z.string().min(1),
  from: z.string().optional(),
  body: z.string().min(1),
});

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "whatsapp.message.create");
    if (denied) return denied;
    try {
      const body = sendWhatsAppSchema.parse(await req.json());
      const message = await prisma.whatsAppMessage.create({
        data: {
          to: body.to,
          from: body.from,
          body: body.body,
          status: "queued",
          companyId,
        },
      });
      return jsonOk(
        {
          data: message,
          stub: true,
          message: "WhatsApp integration stub — message queued for delivery",
        },
        201
      );
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "whatsapp" }
);
