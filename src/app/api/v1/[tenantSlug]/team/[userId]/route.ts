import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { canManageTeam, canManageAccounts } from "@/lib/team/access";
import { getAccessForRole } from "@/lib/team/agent-access";
import { canViewAgentProfile } from "@/lib/agents/scope";
import { agentPerformanceStats } from "@/lib/agents/stats";

const MEMBER_TAGS = ["ADMIN", "AGENT", "DEVELOPER", "MANAGER"] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  memberTag: z.enum(MEMBER_TAGS).optional().nullable(),
  roleSlug: z.enum(["owner", "admin", "manager", "sales", "support", "marketing"]).optional(),
});

export const GET = withApi(
  async (_req, { companyId, user, params }) => {
    const denied = requirePerm(user, "team.member.read");
    if (denied) return denied;

    const isSelf = params.userId === user.id;
    if (!canViewAgentProfile(user, params.userId)) {
      return jsonError("Forbidden", 403);
    }

    try {
      const member = await prisma.companyMember.findFirst({
        where: { companyId, userId: params.userId },
        include: {
          user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });
      if (!member) return jsonError("Member not found", 404);

      const permissions = member.role.permissions.map((p) => p.permission.key);
      const [assignedLeads, callsMade, emailsSent, performance, recentLeads] =
        await Promise.all([
          prisma.lead.count({
            where: { companyId, assignedToId: params.userId, deletedAt: null },
          }),
          prisma.leadCall.count({ where: { companyId, userId: params.userId } }),
          prisma.leadEmail.count({ where: { companyId, userId: params.userId } }),
          agentPerformanceStats(companyId, params.userId),
          prisma.lead.findMany({
            where: { companyId, assignedToId: params.userId, deletedAt: null },
            orderBy: { updatedAt: "desc" },
            take: 10,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              priority: true,
              expectedRevenue: true,
              updatedAt: true,
            },
          }),
        ]);

      return jsonOk({
        data: {
          ...member,
          stats: { assignedLeads, callsMade, emailsSent },
          performance,
          recentLeads,
          access: getAccessForRole(member.role.slug, permissions),
          viewerIsAdmin: canManageTeam(user) && !isSelf,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "team", permission: "team.member.read" }
);

export const PATCH = withApi(
  async (req, { companyId, user, params }) => {
    if (!canManageTeam(user)) {
      return jsonError("Only admins can update team members", 403);
    }
    const denied = requirePerm(user, "team.member.update");
    if (denied) return denied;

    try {
      const body = updateSchema.parse(await req.json());
      if ((body.email || body.password || body.name) && !canManageAccounts(user)) {
        return jsonError("Only owner/admin can change name, email, or password", 403);
      }

      const member = await prisma.companyMember.findFirst({
        where: { companyId, userId: params.userId },
      });
      if (!member) return jsonError("Member not found", 404);

      if (body.email) {
        const taken = await prisma.user.findFirst({
          where: { email: body.email, id: { not: params.userId } },
        });
        if (taken) return jsonError("Email already in use", 409);
      }

      const userData: { name?: string; email?: string; passwordHash?: string } = {};
      if (body.name) userData.name = body.name;
      if (body.email) userData.email = body.email;
      if (body.password) userData.passwordHash = await bcrypt.hash(body.password, 12);

      if (Object.keys(userData).length) {
        await prisma.user.update({ where: { id: params.userId }, data: userData });
      }

      const memberData: { memberTag?: typeof body.memberTag; roleId?: string } = {};
      if (body.memberTag !== undefined) memberData.memberTag = body.memberTag;
      if (body.roleSlug) {
        const role = await prisma.role.findUnique({
          where: { companyId_slug: { companyId, slug: body.roleSlug } },
        });
        if (!role) return jsonError("Role not found", 400);
        memberData.roleId = role.id;
      }

      if (Object.keys(memberData).length) {
        await prisma.companyMember.update({ where: { id: member.id }, data: memberData });
      }

      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "team", permission: "team.member.update" }
);

export const DELETE = withApi(
  async (_req, { companyId, user, params }) => {
    if (!canManageTeam(user)) {
      return jsonError("Only admins can remove team members", 403);
    }
    if (params.userId === user.id) {
      return jsonError("Cannot remove yourself", 400);
    }
    const denied = requirePerm(user, "team.member.delete");
    if (denied) return denied;

    try {
      await prisma.companyMember.deleteMany({
        where: { companyId, userId: params.userId },
      });
      return jsonOk({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "team", permission: "team.member.delete" }
);
