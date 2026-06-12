import { z } from "zod";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/middleware";
import { jsonOk, handleApiError } from "@/lib/api/response";
import { requirePerm } from "@/lib/api/guard";
import { chatWithAssistant } from "@/lib/ai/client";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional(),
});

export const POST = withApi(
  async (req, { companyId, user }) => {
    const denied = requirePerm(user, "ai_assistant.chat.use");
    if (denied) return denied;
    try {
      const body = chatSchema.parse(await req.json());

      if (body.stream) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: body.messages,
          stream: true,
          max_tokens: 1000,
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content ?? "";
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new NextResponse(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const reply = await chatWithAssistant(companyId, body.messages);
      return jsonOk({ data: { role: "assistant", content: reply } });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { moduleId: "ai_assistant" }
);
