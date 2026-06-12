export type FormFieldType = "text" | "email" | "phone" | "textarea" | "select" | "number";

export interface FormFieldDef {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "number",
];

export const FORM_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  fields: Omit<FormFieldDef, "id">[];
}[] = [
  {
    id: "contact",
    name: "Contact form",
    description: "Name, email, message",
    fields: [
      { type: "text", label: "Full name", required: true, placeholder: "John Smith" },
      { type: "email", label: "Email", required: true, placeholder: "you@company.com" },
      { type: "textarea", label: "Message", required: true, placeholder: "How can we help?" },
    ],
  },
  {
    id: "lead",
    name: "Lead capture",
    description: "Name, email, phone, company",
    fields: [
      { type: "text", label: "Full name", required: true },
      { type: "email", label: "Work email", required: true },
      { type: "phone", label: "Phone", required: false },
      { type: "text", label: "Company", required: false },
    ],
  },
  {
    id: "blank",
    name: "Blank form",
    description: "Start from scratch",
    fields: [],
  },
];

export function fieldsFromTemplate(templateId: string): FormFieldDef[] {
  const template = FORM_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];
  return template.fields.map((f, i) => ({
    ...f,
    id: `field-${templateId}-${i}-${Date.now()}`,
  }));
}
