import OpenAI from "openai";
import { prisma } from "@/lib/db";

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export async function chatWithAssistant(
  companyId: string,
  messages: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<string> {
  const moduleSettings = await prisma.companyModule.findUnique({
    where: { companyId_moduleId: { companyId, moduleId: "ai_assistant" } },
  });

  const settings = (moduleSettings?.settings as { model?: string }) ?? {};
  const model = settings.model ?? "gpt-4o-mini";

  const [leads, deals, tickets] = await Promise.all([
    prisma.lead.count({ where: { companyId, deletedAt: null } }),
    prisma.deal.count({ where: { companyId, status: "OPEN", deletedAt: null } }),
    prisma.ticket.count({ where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const systemPrompt = `You are a CRM AI assistant for a business. Current stats: ${leads} leads, ${deals} open deals, ${tickets} open tickets. Help with lead summaries, email drafts, task suggestions, and CRM insights. Be concise and actionable.`;

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content ?? "I couldn't generate a response.";
}

export async function summarizeLead(leadId: string, companyId: string): Promise<string> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId },
    include: { notes: true, activities: true },
  });
  if (!lead) return "Lead not found.";

  return chatWithAssistant(companyId, [
    {
      role: "user",
      content: `Summarize this lead: ${lead.firstName} ${lead.lastName ?? ""}, status: ${lead.status}, score: ${lead.score}, source: ${lead.source}. Notes: ${lead.notes.map((n) => n.content).join("; ")}`,
    },
  ]);
}

export async function draftEmail(
  companyId: string,
  context: string,
  purpose: string
): Promise<string> {
  return chatWithAssistant(companyId, [
    { role: "user", content: `Draft a professional email for: ${purpose}. Context: ${context}` },
  ]);
}
