import type { ModuleManifest } from "./types";

const actions = ["create", "read", "update", "delete", "export"] as const;

function perms(moduleId: string, resource: string) {
  return actions.map((a) => `${moduleId}.${resource}.${a}`);
}

/** Active tenant navigation — only these modules appear in the sidebar */
export const MODULE_MANIFESTS: ModuleManifest[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Overview and metrics",
    icon: "LayoutDashboard",
    category: "main",
    sortOrder: 1,
    routes: [{ path: "/", label: "Dashboard" }],
    permissions: perms("reports", "report"),
  },
  {
    id: "leads",
    name: "Leads",
    description: "Lead inbox and management",
    icon: "UserPlus",
    category: "main",
    sortOrder: 2,
    routes: [{ path: "/leads", label: "Leads" }],
    permissions: perms("leads", "lead"),
  },
  {
    id: "agents",
    name: "Agents",
    description: "Sales agent accounts",
    icon: "UserCog",
    category: "main",
    sortOrder: 3,
    routes: [{ path: "/agents", label: "Agents" }],
    permissions: [...perms("team", "member"), "team.member.manage_users"],
  },
  {
    id: "pipeline",
    name: "Pipeline",
    description: "Lead pipeline board",
    icon: "Kanban",
    category: "main",
    sortOrder: 4,
    routes: [{ path: "/leads/kanban", label: "Pipeline" }],
    permissions: perms("leads", "lead"),
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Marketing campaigns",
    icon: "Megaphone",
    category: "growth",
    sortOrder: 5,
    routes: [{ path: "/marketing", label: "Marketing" }],
    permissions: perms("marketing", "campaign"),
  },
  {
    id: "email_campaigns",
    name: "Email Campaigns",
    description: "Email sequences",
    icon: "Mail",
    category: "growth",
    sortOrder: 6,
    routes: [{ path: "/email-campaigns", label: "Email Campaigns" }],
    permissions: perms("email_campaigns", "sequence"),
  },
  {
    id: "forms",
    name: "Forms",
    description: "Lead capture forms",
    icon: "FormInput",
    category: "growth",
    sortOrder: 7,
    routes: [{ path: "/forms", label: "Forms" }],
    permissions: perms("forms", "form"),
  },
  {
    id: "ai_assistant",
    name: "AI Assistant",
    description: "AI-powered insights",
    icon: "Bot",
    category: "ai",
    sortOrder: 8,
    routes: [{ path: "/ai", label: "AI Assistant" }],
    permissions: ["ai_assistant.chat.use"],
  },
  {
    id: "team",
    name: "Team",
    description: "Team members and roles",
    icon: "UsersRound",
    category: "admin",
    sortOrder: 9,
    routes: [{ path: "/team", label: "Team" }],
    permissions: [...perms("team", "member"), "team.member.manage_users"],
  },
  {
    id: "reports",
    name: "Reports",
    description: "Analytics and reports",
    icon: "BarChart3",
    category: "analytics",
    sortOrder: 10,
    routes: [{ path: "/reports", label: "Reports" }],
    permissions: perms("reports", "report"),
  },
];

export const ACTIVE_MODULE_IDS = MODULE_MANIFESTS.map((m) => m.id);

export const SETTINGS_PERMISSIONS = [
  "settings.company.manage_settings",
  "settings.users.manage_users",
  "settings.roles.manage_settings",
  "settings.custom_fields.manage_settings",
  "settings.billing.manage_settings",
  "settings.automations.manage_settings",
];

export function getManifest(moduleId: string): ModuleManifest | undefined {
  return MODULE_MANIFESTS.find((m) => m.id === moduleId);
}
