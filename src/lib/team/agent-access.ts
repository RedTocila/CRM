import { MODULE_MANIFESTS } from "@/lib/modules/manifests";

const ROLE_MODULE_ACCESS: Record<string, string[]> = {
  owner: MODULE_MANIFESTS.map((m) => m.id),
  admin: MODULE_MANIFESTS.map((m) => m.id),
  manager: MODULE_MANIFESTS.filter((m) => m.id !== "agents").map((m) => m.id),
  sales: ["dashboard", "leads", "pipeline", "reports"],
  marketing: ["dashboard", "leads", "marketing", "email_campaigns", "forms", "reports"],
  support: ["dashboard", "reports"],
  developer: MODULE_MANIFESTS.map((m) => m.id),
};

export function getAccessForRole(roleSlug: string, permissions: string[]) {
  const modules = ROLE_MODULE_ACCESS[roleSlug] ?? ["dashboard", "leads"];
  return {
    modules,
    permissions,
    capabilities: {
      canAssignLeads: ["owner", "admin", "manager"].includes(roleSlug),
      canManageTeam: ["owner", "admin", "manager"].includes(roleSlug),
      canBulkEditLeads: ["owner", "admin", "manager"].includes(roleSlug),
      canUseEmailTemplates: true,
      canViewAllLeads: !["sales"].includes(roleSlug),
      canCreateAccounts: ["owner", "admin"].includes(roleSlug),
    },
  };
}
