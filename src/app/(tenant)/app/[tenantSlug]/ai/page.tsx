"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/${tenantSlug}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      const content = json.data?.content ?? json.reply ?? json.message ?? "No response";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="AI Assistant"
        description="Get CRM insights, summaries, and email drafts powered by AI"
      />

      <div className="glass-card rounded-xl flex flex-col min-h-[560px] overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-3 bg-muted/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">CRM Assistant</span>
          <Sparkles className="h-3.5 w-3.5 text-primary ml-auto" />
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
          {messages.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Ask about leads, deals, draft emails, or get task suggestions.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 flex gap-2 bg-card/50">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI assistant..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="shrink-0 h-auto px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
