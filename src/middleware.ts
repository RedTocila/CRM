import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import { isDemoTemplateSlug } from "@/lib/crm-templates";

const { auth } = NextAuth(authConfig);

const publicPaths = [
  "/login",
  "/register",
  "/templates",
  "/api/auth",
  "/api/webhooks",
  "/api/preview",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (req.auth?.user?.isSuperAdmin) {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }
    const slug = (req.auth?.user as { activeCompanySlug?: string })?.activeCompanySlug;
    if (slug) {
      return NextResponse.redirect(new URL(`/app/${slug}`, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/super-admin") && !(req.auth?.user as { isSuperAdmin?: boolean })?.isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/app/") && !req.auth?.user) {
    const tenantSlug = pathname.split("/")[2];
    if (tenantSlug && isDemoTemplateSlug(tenantSlug)) {
      return NextResponse.redirect(new URL(`/api/preview/${tenantSlug}`, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
