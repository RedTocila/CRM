export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  isSuperAdmin: boolean;
  activeCompanyId?: string | null;
  activeCompanySlug?: string | null;
  roleId?: string | null;
  roleSlug?: string | null;
  permissions: string[];
  impersonatingCompanyId?: string | null;
  impersonatedBy?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    isSuperAdmin?: boolean;
  }
}
