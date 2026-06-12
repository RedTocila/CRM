import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";

export const GET = withApi(
  async (req, { user, companyId }) => {
    try {
      const { searchParams } = new URL(req.url);
      const unreadOnly = searchParams.get("unread") === "true";

      const notifications = await prisma.notification.findMany({
        where: {
          userId: user.id,
          companyId,
          ...(unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, companyId, read: false },
      });

      return jsonOk({ data: notifications, unreadCount });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const PATCH = withApi(
  async (req, { user, companyId }) => {
    try {
      const body = (await req.json()) as { ids?: string[]; markAllRead?: boolean };

      if (body.markAllRead) {
        await prisma.notification.updateMany({
          where: { userId: user.id, companyId, read: false },
          data: { read: true },
        });
      } else if (body.ids?.length) {
        await prisma.notification.updateMany({
          where: { id: { in: body.ids }, userId: user.id },
          data: { read: true },
        });
      }

      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
