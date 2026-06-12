export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NOT_INTERESTED",
  "FOLLOW_UP_NEEDED",
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const KANBAN_STATUSES: LeadStatusValue[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
];

export const LOST_STATUSES: LeadStatusValue[] = ["LOST", "NOT_INTERESTED"];

export const LEAD_SOURCES = [
  "FACEBOOK_ADS",
  "INSTAGRAM_ADS",
  "GOOGLE_ADS",
  "WEBSITE",
  "WHATSAPP",
  "REFERRAL",
  "COLD_CALL",
  "LINKEDIN",
  "TIKTOK",
  "MANUAL_ENTRY",
  "OTHER",
] as const;

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const FOLLOW_UP_TYPES = ["CALL", "EMAIL", "MEETING", "WHATSAPP"] as const;

export const PLAN_FEATURES = [
  "email_tracking",
  "call_tracking",
  "pipelines",
  "automations",
  "advanced_analytics",
  "api_access",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  NOT_INTERESTED: "Not Interested",
  FOLLOW_UP_NEEDED: "Follow Up Needed",
};

export const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK_ADS: "Facebook Ads",
  INSTAGRAM_ADS: "Instagram Ads",
  GOOGLE_ADS: "Google Ads",
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  COLD_CALL: "Cold Call",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  MANUAL_ENTRY: "Manual Entry",
  OTHER: "Other",
};
