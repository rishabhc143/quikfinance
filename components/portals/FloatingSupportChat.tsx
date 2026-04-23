"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

type SupportMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
};

type ChatState = {
  configured: boolean;
  messages: SupportMessage[];
  tickets: SupportTicket[];
};

type SendMessageResponse = {
  user_message: SupportMessage;
  assistant_message: SupportMessage;
  ticket: SupportTicket | null;
  configured: boolean;
};

const quickPrompts = [
  "Show my latest invoice",
  "How can I pay?",
  "I have a billing issue",
  "I need a human to help me"
];

function mergeMessages(primary: SupportMessage[], incoming: SupportMessage[]) {
  return incoming.reduce<SupportMessage[]>(
    (messages, item) => (messages.some((messageItem) => messageItem.id === item.id) ? messages : [...messages, item]),
    primary
  );
}

function mergeTickets(primary: SupportTicket[], incoming: SupportTicket[]) {
  return incoming.reduce<SupportTicket[]>(
    (tickets, item) => (tickets.some((ticket) => ticket.id === item.id) ? tickets : [...tickets, item]),
    primary
  );
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();
  if (!text.trim()) {
    return { error: { message: fallbackMessage } } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 140);
    return { error: { message: `${fallbackMessage}${preview ? ` Server returned: ${preview}` : ""}` } } as T;
  }
}

export function FloatingSupportChat({
  token,
  customerName
}: {
  token: string;
  customerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<SupportMessage[]>([]);
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatQueryKey = ["floating-portal-support-chat", token] as const;

  const chat = useQuery({
    queryKey: chatQueryKey,
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch(`/api/public/chat/${token}`);
      const payload = await parseJsonResponse<{ data?: ChatState; error?: { message?: string } }>(
        response,
        "Support chat returned an empty response."
      );
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Support chat could not be loaded.");
      }
      return payload.data ?? { configured: false, messages: [], tickets: [] };
    }
  });

  useEffect(() => {
    if (chat.data?.messages?.length) {
      setLocalMessages((current) => mergeMessages(chat.data?.messages ?? [], current.filter((item) => item.id.startsWith("local-"))));
    }
    if (chat.data?.tickets?.length) {
      setLocalTickets(chat.data.tickets);
    }
  }, [chat.data?.messages, chat.data?.tickets]);

  const visibleMessages = useMemo(() => localMessages, [localMessages]);
  const latestTicket = localTickets[0] ?? chat.data?.tickets?.[0];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isOpen, visibleMessages.length, isSending]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 2 || isSending) {
      return;
    }

    setIsSending(true);
    setMessage("");
    const localUserMessage: SupportMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      body: trimmed,
      created_at: new Date().toISOString()
    };
    setLocalMessages((current) => [...current, localUserMessage]);

    try {
      const response = await fetch(`/api/public/chat/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });

      const payload = await parseJsonResponse<{
        error?: { message?: string };
        data?: SendMessageResponse;
      }>(response, "Support message returned an empty response.");

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Support message could not be sent.");
      }

      if (payload.data?.user_message && payload.data?.assistant_message) {
        setLocalMessages((current) => {
          const withoutTemporaryUser = current.filter((item) => item.id !== localUserMessage.id);
          return mergeMessages(withoutTemporaryUser, [payload.data!.user_message, payload.data!.assistant_message]);
        });
      } else {
        setLocalMessages((current) =>
          mergeMessages(current, [
            {
              id: `local-assistant-${Date.now()}`,
              role: "assistant",
              body: "I received your message. Your support request has been sent to the QuikFinance team.",
              created_at: new Date().toISOString()
            }
          ])
        );
      }
      if (payload.data?.ticket?.ticket_number) {
        setLocalTickets((current) => mergeTickets([payload.data!.ticket!], current));
        toast.success(`Support ticket ${payload.data.ticket.ticket_number} created`);
      }
      void chat.refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Support message could not be sent.";
      setLocalMessages((current) =>
        mergeMessages(current, [
          {
            id: `local-error-${Date.now()}`,
            role: "assistant",
            body: `I could not send that message right now. Please try again in a moment. Details: ${errorMessage}`,
            created_at: new Date().toISOString()
          }
        ])
      );
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section
          aria-label="Customer support chat"
          className="w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border bg-background shadow-2xl sm:w-[420px]"
        >
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">QuikFinance Support</p>
                  <p className="text-xs text-white/70">Ask anything. We will help or create a ticket.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close support chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {!chat.data?.configured ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                The assistant can still create a support ticket even if AI answers are temporarily unavailable.
              </div>
            ) : null}

            <div className="h-[330px] space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-3">
              {chat.isLoading && visibleMessages.length === 0 ? (
                <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground shadow-sm">
                  Loading support chat...
                </div>
              ) : visibleMessages.length > 0 ? (
                <>
                  {visibleMessages.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        item.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-background text-foreground"
                      )}
                    >
                      <p className="text-xs font-semibold opacity-80">
                        {item.role === "user" ? customerName : item.role === "assistant" ? "Support Assistant" : "System"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                  {isSending ? (
                    <div className="max-w-[88%] rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
                      <p className="text-xs font-semibold opacity-80">Support Assistant</p>
                      <p className="mt-1">Thinking and checking your account...</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground shadow-sm">
                    Hi {customerName}, ask me about invoices, payments, statements, orders, refunds, or any billing issue.
                  </div>
                  {isSending ? (
                    <div className="max-w-[88%] rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
                      <p className="text-xs font-semibold opacity-80">Support Assistant</p>
                      <p className="mt-1">Thinking and checking your account...</p>
                    </div>
                  ) : null}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {latestTicket ? (
              <div className="flex items-center gap-2 rounded-2xl border bg-background p-3 text-xs text-muted-foreground">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <span>
                  Latest ticket: <strong className="text-foreground">{latestTicket.ticket_number}</strong> is {latestTicket.status}
                </span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Type your question or issue..."
                className="min-h-20 resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Press Enter to send. Shift + Enter for a new line.</p>
                <Button onClick={sendMessage} disabled={isSending || message.trim().length < 2} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group flex items-center gap-3 rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-2xl shadow-slate-900/30 transition hover:-translate-y-0.5 hover:bg-slate-900"
        aria-label="Open support chat"
      >
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-emerald-400 text-slate-950">
          <MessageCircle className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-lime-300" />
        </span>
        <span className="hidden text-left sm:block">
          Need help?
          <span className="block text-xs font-medium text-white/65">Chat with support</span>
        </span>
      </button>
    </div>
  );
}
