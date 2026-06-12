import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { isModuleEnabled } from "@/lib/modules/registry";
import { can } from "@/lib/permissions/check";
import { checkPlanLimit } from "@/lib/billing/limits";
import type { SessionUser } from "@/types/auth";

export interface ApiContext {
  user: SessionUser;
  companyId: string;
  companySlug: string;
}

type RouteHandler = (
  req: Request,
  ctx: ApiContext & { params: Record<string, string> }
) => Promise<NextResponse>;

export function withApi(
  handler: RouteHandler,
  options?: {
    moduleId?: string;
    permission?: string;
    superAdminOnly?: boolean;
    checkLimit?: string;
  }
) {
  return async (req: Request, context: { params: Promise<Record<string, string>> }) => {
    const params = await context.params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;

    if (options?.superAdminOnly) {
      if (!user.isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return handler(req, {
        user,
        companyId: "",
        companySlug: "",
        params,
      });
    }

    const tenantSlug = params.tenantSlug;
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant required" }, { status: 400 });
    }

    const company = await resolveTenantBySlug(tenantSlug);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status === "SUSPENDED") {
      return NextResponse.json({ error: "Company suspended" }, { status: 403 });
    }

    const effectiveCompanyId =
      user.impersonatingCompanyId ?? user.activeCompanyId;

    if (!user.isSuperAdmin && effectiveCompanyId !== company.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!user.isSuperAdmin) {
      if (options?.moduleId) {
        const enabled = await isModuleEnabled(company.id, options.moduleId);
        if (!enabled) {
          return NextResponse.json({ error: "Module disabled" }, { status: 403 });
        }
      }

      if (options?.permission && !can(user, options.permission)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      if (options?.checkLimit) {
        const limitCheck = await checkPlanLimit(company.id, options.checkLimit);
        if (!limitCheck.allowed) {
          return NextResponse.json(
            { error: "Plan limit reached", limit: limitCheck },
            { status: 402 }
          );
        }
      }
    }

    return handler(req, {
      user,
      companyId: company.id,
      companySlug: company.slug,
      params,
    });
  };
}

export function withPlatform(handler: RouteHandler) {
  return withApi(handler, { superAdminOnly: true });
}
