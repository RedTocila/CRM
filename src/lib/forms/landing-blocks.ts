export type LandingBlockType =
  | "hero"
  | "text"
  | "image"
  | "cta"
  | "features"
  | "testimonial"
  | "form"
  | "spacer";

export interface LandingBlock {
  id: string;
  type: LandingBlockType;
  title?: string;
  subtitle?: string;
  body?: string;
  alignment?: "left" | "center" | "right";
  imageUrl?: string;
  imageAlt?: string;
  buttonText?: string;
  buttonUrl?: string;
  formId?: string;
  quote?: string;
  author?: string;
  role?: string;
  items?: { title: string; description: string }[];
  height?: number;
  bgColor?: string;
}

export const PALETTE_BLOCKS: {
  type: LandingBlockType;
  label: string;
  description: string;
}[] = [
  { type: "hero", label: "Hero", description: "Headline and subtitle" },
  { type: "text", label: "Text", description: "Paragraph section" },
  { type: "image", label: "Image", description: "Image with caption" },
  { type: "cta", label: "Call to action", description: "Button section" },
  { type: "features", label: "Features", description: "3-column highlights" },
  { type: "testimonial", label: "Testimonial", description: "Customer quote" },
  { type: "form", label: "Lead form", description: "Embed a capture form" },
  { type: "spacer", label: "Spacer", description: "Vertical spacing" },
];

export function createLandingBlock(type: LandingBlockType): LandingBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case "hero":
      return {
        id,
        type,
        title: "Your headline here",
        subtitle: "Tell visitors what you offer in one clear sentence.",
        alignment: "center",
        bgColor: "#f8fafc",
      };
    case "text":
      return {
        id,
        type,
        body: "Add your story, benefits, or details. Keep it scannable and focused on the visitor.",
        alignment: "left",
      };
    case "image":
      return {
        id,
        type,
        imageUrl: "",
        imageAlt: "Product image",
        title: "Image caption",
        alignment: "center",
      };
    case "cta":
      return {
        id,
        type,
        title: "Ready to get started?",
        buttonText: "Get started",
        buttonUrl: "#",
        alignment: "center",
        bgColor: "#2563eb",
      };
    case "features":
      return {
        id,
        type,
        title: "Why choose us",
        items: [
          { title: "Fast setup", description: "Launch in minutes, not weeks." },
          { title: "Built for teams", description: "Collaborate with your whole sales team." },
          { title: "Secure", description: "Enterprise-grade data protection." },
        ],
        alignment: "center",
      };
    case "testimonial":
      return {
        id,
        type,
        quote: "This product transformed how we manage leads. Our team closes faster every week.",
        author: "Jane Doe",
        role: "Sales Director",
        alignment: "center",
      };
    case "form":
      return { id, type, title: "Get in touch", subtitle: "We'll respond within 24 hours." };
    case "spacer":
      return { id, type, height: 48 };
    default:
      return { id, type: "text", body: "" };
  }
}

export const LANDING_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  blocks: LandingBlockType[];
}[] = [
  {
    id: "blank",
    name: "Blank page",
    description: "Start with an empty canvas",
    blocks: [],
  },
  {
    id: "lead-capture",
    name: "Lead capture",
    description: "Hero + benefits + form",
    blocks: ["hero", "features", "form"],
  },
  {
    id: "product-launch",
    name: "Product launch",
    description: "Hero + image + CTA + testimonial",
    blocks: ["hero", "image", "cta", "testimonial"],
  },
];

export function blocksFromTemplate(templateId: string): LandingBlock[] {
  const template = LANDING_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];
  return template.blocks.map((type) => createLandingBlock(type));
}
