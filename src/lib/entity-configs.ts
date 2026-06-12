import type { FieldConfig } from "@/components/shared/crud-module-page";

export interface EntityConfig {
  title: string;
  description: string;
  apiSegment: string;
  createLabel: string;
  fields: FieldConfig[];
  allowDelete?: boolean;
}

export const entityConfigs: Record<string, EntityConfig> = {
  leads: {
    title: "Leads",
    description: "Capture, qualify, and convert prospects",
    apiSegment: "leads",
    createLabel: "New Lead",
    fields: [
      { name: "firstName", label: "First Name", type: "text", required: true },
      { name: "lastName", label: "Last Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "company", label: "Company", type: "text" },
      { name: "source", label: "Source", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED"],
        defaultValue: "NEW",
      },
      { name: "score", label: "Score", type: "number", defaultValue: 0 },
    ],
  },
  contacts: {
    title: "Contacts",
    description: "Manage customer relationships",
    apiSegment: "contacts",
    createLabel: "New Contact",
    fields: [
      { name: "firstName", label: "First Name", type: "text", required: true },
      { name: "lastName", label: "Last Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "company", label: "Company", type: "text" },
      { name: "title", label: "Job Title", type: "text" },
    ],
  },
  tasks: {
    title: "Tasks",
    description: "Track work and deadlines",
    apiSegment: "tasks",
    createLabel: "New Task",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        defaultValue: "MEDIUM",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"],
        defaultValue: "TODO",
      },
      { name: "dueDate", label: "Due Date", type: "date" },
    ],
  },
  tickets: {
    title: "Tickets",
    description: "Customer support requests",
    apiSegment: "tickets",
    createLabel: "New Ticket",
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        defaultValue: "MEDIUM",
      },
    ],
  },
  projects: {
    title: "Projects",
    description: "Plan and deliver client work",
    apiSegment: "projects",
    createLabel: "New Project",
    fields: [
      { name: "name", label: "Project Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
    ],
  },
  invoices: {
    title: "Invoices",
    description: "Bill clients and track payments",
    apiSegment: "invoices",
    createLabel: "New Invoice",
    fields: [
      { name: "number", label: "Invoice #", type: "text", required: true },
      { name: "contactName", label: "Contact", type: "text" },
      { name: "total", label: "Total", type: "number", defaultValue: 0 },
    ],
  },
  estimates: {
    title: "Estimates",
    description: "Send project estimates",
    apiSegment: "estimates",
    createLabel: "New Estimate",
    fields: [
      { name: "number", label: "Estimate #", type: "text", required: true },
      { name: "contactName", label: "Contact", type: "text" },
      { name: "total", label: "Total", type: "number", defaultValue: 0 },
    ],
  },
  quotes: {
    title: "Quotes",
    description: "Create and send quotes",
    apiSegment: "quotes",
    createLabel: "New Quote",
    fields: [
      { name: "number", label: "Quote #", type: "text", required: true },
      { name: "contactName", label: "Contact", type: "text" },
      { name: "total", label: "Total", type: "number", defaultValue: 0 },
    ],
  },
  forms: {
    title: "Forms",
    description: "Build lead capture forms",
    apiSegment: "forms",
    createLabel: "New Form",
    fields: [
      { name: "name", label: "Form Name", type: "text", required: true },
    ],
  },
  "knowledge-base": {
    title: "Knowledge Base",
    description: "Help articles for your team",
    apiSegment: "knowledge-base",
    createLabel: "New Article",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text" },
      { name: "content", label: "Content", type: "textarea", required: true },
    ],
  },
  marketing: {
    title: "Marketing",
    description: "Campaign management",
    apiSegment: "campaigns",
    createLabel: "New Campaign",
    fields: [
      { name: "name", label: "Campaign Name", type: "text", required: true },
      { name: "type", label: "Type", type: "text", defaultValue: "email" },
    ],
  },
  "email-campaigns": {
    title: "Email Campaigns",
    description: "Automated email sequences",
    apiSegment: "email-sequences",
    createLabel: "New Sequence",
    fields: [
      { name: "name", label: "Sequence Name", type: "text", required: true },
    ],
  },
  calendar: {
    title: "Calendar",
    description: "Meetings and events",
    apiSegment: "calendar",
    createLabel: "New Event",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "location", label: "Location", type: "text" },
      { name: "startAt", label: "Start", type: "datetime-local", required: true },
      { name: "endAt", label: "End", type: "datetime-local", required: true },
    ],
  },
  whatsapp: {
    title: "WhatsApp",
    description: "Send WhatsApp messages",
    apiSegment: "whatsapp",
    createLabel: "Send Message",
    allowDelete: false,
    fields: [
      { name: "to", label: "Phone Number", type: "text", required: true },
      { name: "body", label: "Message", type: "textarea", required: true },
    ],
  },
  sms: {
    title: "SMS",
    description: "Send SMS messages",
    apiSegment: "sms",
    createLabel: "Send SMS",
    allowDelete: false,
    fields: [
      { name: "to", label: "Phone Number", type: "text", required: true },
      { name: "body", label: "Message", type: "textarea", required: true },
    ],
  },
  documents: {
    title: "Documents",
    description: "File storage and sharing",
    apiSegment: "documents",
    createLabel: "Add Document",
    allowDelete: false,
    fields: [
      { name: "name", label: "File Name", type: "text", required: true },
      { name: "url", label: "File URL", type: "text", required: true },
    ],
  },
  automations: {
    title: "Automations",
    description: "Workflow automation builder",
    apiSegment: "automations",
    createLabel: "New Automation",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
};
