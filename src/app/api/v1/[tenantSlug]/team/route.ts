import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManageAccounts } from "@/lib/team/access";

const MEMBER_TAGS = ["ADMIN", "AGENT", "DEVELOPER", "MANAGER"] as const;

const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleSlug: z.enum(["sales", "support", "marketing", "admin", "manager"]).default("sales"),
  memberTag: z.enum(MEMBER_TAGS).optional(),
});

export const GET = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "team.member.read");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const agentsOnly = searchParams.get("agentsOnly") === "true";

    const members = await prisma.companyMember.findMany({
      where: {
        companyId,
        ...(agentsOnly ? { role: { slug: "sales" } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        role: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (agentsOnly) {
      return jsonOk({
        data: members.map((m) => ({
          id: m.user.id,
          name: m.user.name ?? m.user.email,
          email: m.user.email,
        })),
      });
    }

    return jsonOk({ data: members });
  },
  { moduleId: "team", permission: "team.member.read" }
);

export const POST = withApi(
  async (req, { companyId, user }) => {
    if (!canManageAccounts(user)) {
      return jsonError("Only company admins can create accounts", 403);
    }
    const denied = requirePerm(user, "team.member.create");
    if (denied) return denied;

    try {
      const body = createAgentSchema.parse(await req.json());

      const role = await prisma.role.findUnique({
        where: { companyId_slug: { companyId, slug: body.roleSlug } },
      });
      if (!role) {
        return jsonError(`Role "${body.roleSlug}" not found for this company`, 400);
      }

      const existingMember = await prisma.companyMember.findFirst({
        where: { companyId, user: { email: body.email } },
      });
      if (existingMember) {
        return jsonError("This user is already on your team", 409);
      }

      let agentUser = await prisma.user.findUnique({ where: { email: body.email } });

      if (agentUser) {
        const otherMembership = await prisma.companyMember.findFirst({
          where: { userId: agentUser.id },
        });
        if (otherMembership && otherMembership.companyId !== companyId) {
          // User exists elsewhere — still add to this company
        }
      } else {
        const passwordHash = await bcrypt.hash(body.password, 12);
        agentUser = await prisma.user.create({
          data: {
            email: body.email,
            name: body.name,
            passwordHash,
            status: "ACTIVE",
          },
        });
      }

      const defaultTag =
        body.memberTag ??
        (body.roleSlug === "sales"
          ? "AGENT"
          : body.roleSlug === "admin"
            ? "ADMIN"
            : body.roleSlug === "manager"
              ? "MANAGER"
              : "AGENT");

      const member = await prisma.companyMember.create({
        data: {
          companyId,
          userId: agentUser.id,
          roleId: role.id,
          memberTag: defaultTag,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true, slug: true } },
        },
      });

      return jsonOk({ data: member }, 201);
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "team", permission: "team.member.create" }
);
