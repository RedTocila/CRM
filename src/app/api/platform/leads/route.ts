import { prisma } from "@/lib/db";
import { withPlatform } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";

export const GET = withPlatform(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const q = searchParams.get("q")?.trim();

    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return jsonOk({ data: leads });
  } catch (error) {
    return handleApiError(error);
  }
});
