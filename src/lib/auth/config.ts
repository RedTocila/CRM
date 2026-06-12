import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth/auth.config";

async function getUserPermissions(userId: string, companyId: string): Promise<{
  roleId: string;
  roleSlug: string;
  permissions: string[];
}> {
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId } },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  if (!membership) {
    return { roleId: "", roleSlug: "", permissions: [] };
  }

  return {
    roleId: membership.roleId,
    roleSlug: membership.role.slug,
    permissions: membership.role.permissions.map((rp) => rp.permission.key),
  };
}

async function resolveActiveCompany(userId: string, preferredCompanyId?: string | null) {
  if (preferredCompanyId) {
    const company = await prisma.company.findFirst({
      where: {
        id: preferredCompanyId,
        status: "ACTIVE",
        members: { some: { userId } },
      },
    });
    if (company) return company;
  }

  const membership = await prisma.companyMember.findFirst({
    where: { userId, company: { status: "ACTIVE" } },
    include: { company: true },
    orderBy: { joinedAt: "asc" },
  });

  return membership?.company ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash || user.status !== "ACTIVE") return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.permissions = [];
      }

      if (trigger === "update" && session) {
        const s = session as { activeCompanyId?: string; impersonatingCompanyId?: string | null };
        if (s.activeCompanyId !== undefined) token.activeCompanyId = s.activeCompanyId;
        if (s.impersonatingCompanyId !== undefined) {
          token.impersonatingCompanyId = s.impersonatingCompanyId;
          if (s.impersonatingCompanyId) {
            token.impersonatedBy = token.id;
          } else {
            token.impersonatedBy = null;
          }
        }
      }

      const effectiveCompanyId =
        token.impersonatingCompanyId ?? token.activeCompanyId;

      if (effectiveCompanyId && token.id) {
        const company = await prisma.company.findUnique({
          where: { id: effectiveCompanyId as string },
        });
        if (company) {
          token.activeCompanySlug = company.slug;
          if (!token.impersonatingCompanyId) {
            token.activeCompanyId = company.id;
          }
          const perms = await getUserPermissions(String(token.id), company.id);
          token.roleId = perms.roleId;
          token.roleSlug = perms.roleSlug;
          token.permissions = perms.permissions;
        }
      } else if (token.id && !token.isSuperAdmin) {
        const company = await resolveActiveCompany(String(token.id));
        if (company) {
          token.activeCompanyId = company.id;
          token.activeCompanySlug = company.slug;
          const perms = await getUserPermissions(String(token.id), company.id);
          token.roleId = perms.roleId;
          token.roleSlug = perms.roleSlug;
          token.permissions = perms.permissions;
        }
      }

      return token;
    },
    session: authConfig.callbacks.session,
  },
});
