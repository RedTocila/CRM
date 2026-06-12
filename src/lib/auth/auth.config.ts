import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js config (no Prisma/pg/bcrypt).
 * Used by middleware. Full auth with DB lives in config.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.id ?? token.sub ?? ""),
        email: token.email!,
        name: token.name,
        isSuperAdmin: Boolean(token.isSuperAdmin),
        activeCompanyId: token.activeCompanyId as string | null | undefined,
        activeCompanySlug: token.activeCompanySlug as string | null | undefined,
        roleId: token.roleId as string | null | undefined,
        roleSlug: token.roleSlug as string | null | undefined,
        permissions: (token.permissions as string[]) ?? [],
        impersonatingCompanyId: token.impersonatingCompanyId as string | null | undefined,
        impersonatedBy: token.impersonatedBy as string | null | undefined,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
