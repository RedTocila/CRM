export interface CrmTemplateMeta {
  slug: string;
  name: string;
  industry: string;
  description: string;
  primaryColor: string;
  ownerEmail: string;
  highlights: string[];
}

export const CRM_TEMPLATES: CrmTemplateMeta[] = [
  {
    slug: "dental-tourism",
    name: "Smile Abroad Dental",
    industry: "Dental Tourism",
    description:
      "Manage international patient inquiries, treatment packages, travel coordination, and post-care follow-ups.",
    primaryColor: "#0d9488",
    ownerEmail: "dental@template.local",
    highlights: ["Patient pipeline", "Treatment quotes", "Consultation calendar", "WhatsApp follow-ups"],
  },
  {
    slug: "real-estate",
    name: "PrimeNest Realty",
    industry: "Real Estate",
    description:
      "Track buyers and sellers, property viewings, offers, and closings from first inquiry to keys handover.",
    primaryColor: "#1d4ed8",
    ownerEmail: "realestate@template.local",
    highlights: ["Buyer & seller leads", "Viewing schedule", "Offer pipeline", "Deal tracking"],
  },
  {
    slug: "customer-support",
    name: "ResolveDesk Support",
    industry: "Customer Support",
    description:
      "Handle support tickets, SLA tracking, knowledge base articles, and customer communication in one hub.",
    primaryColor: "#059669",
    ownerEmail: "support@template.local",
    highlights: ["Ticket queue", "Knowledge base", "SLA priorities", "Customer profiles"],
  },
];

export const TEMPLATE_PASSWORD = "admin123";
