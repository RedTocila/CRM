export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sortOrder: number;
  routes: { path: string; label: string }[];
  permissions: string[];
}

export const MODULE_IDS = [
  "dashboard",
  "leads",
  "agents",
  "pipeline",
  "marketing",
  "email_campaigns",
  "forms",
  "ai_assistant",
  "team",
  "reports",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];
