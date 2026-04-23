"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

export function SupportChat({ token, customerName, locale = "en" }: { token: string; customerName: string; locale?: "en" | "hi" }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const copy =
    locale === "hi"
      ? {
          title: "सपोर्ट असिस्टेंट",
          description: "इनवॉइस, देय तिथि, भुगतान, स्टेटमेंट, ऑर्डर, कोटेशन या क्रेडिट नोट के बारे में पूछें। जरूरत पड़ने पर असिस्टेंट आपकी समस्या टीम तक पहुंचा सकता है।",
          notConfigured: "AI अभी कॉन्फ़िगर नहीं है। फिर भी QuikFinance आपकी बात लेकर सपोर्ट टिकट बना देगा।",
          loading: "सपोर्ट वार्ता लोड हो रही है...",
          empty: `नमस्ते ${customerName}, मैं इनवॉइस स्थिति, पेमेंट लिंक, स्टेटमेंट डाउनलोड और बिलिंग सवालों में मदद कर सकता हूँ।`,
          placeholder: "अपनी समस्या यहां लिखें...",
          example: 'उदाहरण: "मेरा लेटेस्ट इनवॉइस दिखाइए"',
          send: "भेजें",
          sending: "भेजा जा रहा है...",
          tickets: "हाल के सपोर्ट टिकट",
          ticketCreated: (ticketNumber: string) => `सपोर्ट टिकट ${ticketNumber} बन गया`,
          assistantName: "QuikFinance सपोर्ट",
          quickPrompts: ["मेरा लेटेस्ट इनवॉइस दिखाइए", "मैं भुगतान कैसे करूं?", "मेरा ऑर्डर स्टेटस क्या है?", "मुझे रिफंड या क्रेडिट नोट चाहिए", "मुझे किसी इंसान से बात करनी है"]
        }
      : {
          title: "Support Assistant",
          description:
            "Ask about invoices, due dates, payments, statements, orders, quotations, or credit notes. The assistant can also escalate your issue to the team.",
          notConfigured: "AI assistance is not configured yet. If you send a message, QuikFinance will still create a support ticket for your team.",
          loading: "Loading support conversation...",
          empty: `Hi ${customerName}, I can help with invoice status, payment links, statement downloads, and billing questions.`,
          placeholder: "Type your issue here...",
          example: 'Try: "Show my latest invoice"',
          send: "Send",
          sending: "Sending...",
          tickets: "Recent Support Tickets",
          ticketCreated: (ticketNumber: string) => `Support ticket ${ticketNumber} created`,
          assistantName: "QuikFinance Support",
          quickPrompts: ["Show my latest invoice", "How do I pay this invoice?", "What is my order status?", "I need refund or credit note help", "I need a human to help me"]
        };

  const chat = useQuery({
    queryKey: ["portal-support-chat", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/chat/${token}`);
      const payload = (await response.json()) as { data?: ChatState; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Support chat could not be loaded.");
      }
      return payload.data ?? { configured: false, messages: [], tickets: [] };
    }
  });

  const visibleMessages = useMemo(() => chat.data?.messages ?? [], [chat.data?.messages]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 2 || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/public/chat/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
        data?: { ticket?: SupportTicket | null };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Support message could not be sent.");
      }

      setMessage("");
      if (payload.data?.ticket?.ticket_number) {
        toast.success(copy.ticketCreated(payload.data.ticket.ticket_number));
      }
      await chat.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Support message could not be sent.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!chat.data?.configured ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {copy.notConfigured}
          </div>
        ) : null}

        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border bg-muted/30 p-3">
          {chat.isLoading ? (
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
          ) : visibleMessages.length > 0 ? (
            visibleMessages.map((item) => (
              <div
                key={item.id}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                  item.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-background text-foreground shadow-sm"
                }`}
              >
                <div className="font-semibold">
                  {item.role === "user" ? customerName : item.role === "assistant" ? copy.assistantName : "System"}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
                <p className={`mt-2 text-xs ${item.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(item.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-background p-4 text-sm text-muted-foreground shadow-sm">
              {copy.empty}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {copy.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setMessage(prompt)}
              className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.placeholder}
            className="min-h-24"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{copy.example}</p>
            <Button onClick={sendMessage} disabled={isSending || message.trim().length < 2}>
              {isSending ? copy.sending : copy.send}
            </Button>
          </div>
        </div>

        {(chat.data?.tickets?.length ?? 0) > 0 ? (
          <div className="rounded-2xl border bg-background p-4">
            <p className="text-sm font-semibold">{copy.tickets}</p>
            <div className="mt-3 space-y-2">
              {chat.data?.tickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-medium">{ticket.ticket_number}</p>
                    <p className="text-muted-foreground">{ticket.subject}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{ticket.status}</p>
                    <p>{new Date(ticket.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
