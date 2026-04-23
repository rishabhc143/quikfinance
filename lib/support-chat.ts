import { randomUUID } from "crypto";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { createPortalUrl, type PortalLink, getCustomerPortalPayload } from "@/lib/portals";
import type { Json } from "@/types/database.types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const HISTORY_LIMIT = 12;

type ConversationRow = {
  id: string;
  org_id: string;
  portal_link_id: string;
  contact_id: string | null;
  title: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
  updated_at: string | null;
};

export type SupportMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  body: string;
  created_at: string;
  metadata: Json;
};

export type SupportTicketView = {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
  follow_up: Json;
  created_at: string;
};

type PortalSupportState = {
  configured: boolean;
  conversation: ConversationRow | null;
  messages: SupportMessageView[];
  tickets: SupportTicketView[];
};

type ToolCall = {
  call_id: string;
  name: string;
  arguments: string;
};

type OpenAiResponse = {
  id?: string;
  output?: Array<Record<string, unknown>>;
  output_text?: string;
};

type SupportLocale = "en" | "hi";

type SupportFollowUp = {
  locale: SupportLocale;
  status: "sent" | "ready" | "partial" | "skipped" | "failed";
  channels: string[];
  email: {
    status: "sent" | "skipped" | "failed";
    to: string | null;
    id: string | null;
    sent_at: string | null;
    reason: string | null;
  };
  whatsapp: {
    status: "ready" | "skipped";
    to: string | null;
    url: string | null;
    reason: string | null;
  };
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toMessageView(row: Record<string, unknown>): SupportMessageView {
  return {
    id: asString(row.id),
    role: (asString(row.role) as SupportMessageView["role"]) || "assistant",
    body: asString(row.body),
    created_at: asString(row.created_at),
    metadata: (row.metadata as Json) ?? {}
  };
}

function toTicketView(row: Record<string, unknown>): SupportTicketView {
  return {
    id: asString(row.id),
    ticket_number: asString(row.ticket_number),
    subject: asString(row.subject),
    priority: asString(row.priority),
    status: asString(row.status),
    requested_by_name: typeof row.requested_by_name === "string" ? row.requested_by_name : null,
    requested_by_email: typeof row.requested_by_email === "string" ? row.requested_by_email : null,
    follow_up: (row.follow_up as Json) ?? {},
    created_at: asString(row.created_at)
  };
}

function toLocale(value: unknown): SupportLocale {
  return value === "hi" ? "hi" : "en";
}

function containsAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function normalizePhoneForWhatsApp(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

function formatPortalMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

function localizeStatus(locale: SupportLocale, status: string) {
  if (locale === "en") {
    return status;
  }

  const labels: Record<string, string> = {
    draft: "ड्राफ्ट",
    sent: "भेजा गया",
    viewed: "देखा गया",
    partial: "आंशिक",
    paid: "भुगतान हो गया",
    overdue: "ओवरड्यू",
    open: "खुला",
    closed: "बंद",
    escalated: "एस्केलेटेड",
    resolved: "समाधान हुआ",
    in_progress: "कार्य जारी",
    approved: "स्वीकृत",
    submitted: "सबमिट किया गया",
    void: "रद्द",
    created: "बनाया गया"
  };

  return labels[status] ?? status;
}

function supportText(
  locale: SupportLocale,
  key:
    | "capabilities"
    | "no_unpaid"
    | "statement_link"
    | "order_missing"
    | "quotation_missing"
    | "credit_missing",
  vars?: Record<string, string | number>
) {
  const dictionary = {
    en: {
      capabilities:
        "I can help with invoice status, due dates, unpaid balances, payment links, invoice PDF downloads, statement downloads, order or quotation updates, credit note questions, and support escalation if you need a human.",
      no_unpaid: "Good news - there are no unpaid invoices on this account right now.",
      statement_link: `You can download your current statement here: ${vars?.statementUrl ?? ""}`,
      order_missing: "I could not find an active sales order on this account, so I created a support follow-up instead.",
      quotation_missing: "I could not find an active quotation on this account, so I created a support follow-up instead.",
      credit_missing: "I could not find a credit note yet, so I created a support follow-up for the finance team."
    },
    hi: {
      capabilities:
        "मैं इनवॉइस की स्थिति, देय तिथि, बकाया राशि, पेमेंट लिंक, इनवॉइस PDF, स्टेटमेंट डाउनलोड, ऑर्डर या कोटेशन अपडेट, क्रेडिट नोट सवाल और जरूरत पड़ने पर मानव सपोर्ट में मदद कर सकता हूँ।",
      no_unpaid: "अच्छी खबर - इस अकाउंट पर अभी कोई बकाया इनवॉइस नहीं है।",
      statement_link: `आप अपना मौजूदा स्टेटमेंट यहां डाउनलोड कर सकते हैं: ${vars?.statementUrl ?? ""}`,
      order_missing: "मुझे इस अकाउंट पर कोई सक्रिय सेल्स ऑर्डर नहीं मिला, इसलिए मैंने सपोर्ट फॉलो-अप शुरू कर दिया है।",
      quotation_missing: "मुझे इस अकाउंट पर कोई सक्रिय कोटेशन नहीं मिला, इसलिए मैंने सपोर्ट फॉलो-अप शुरू कर दिया है।",
      credit_missing: "मुझे अभी कोई क्रेडिट नोट नहीं मिला, इसलिए मैंने फाइनेंस टीम के लिए फॉलो-अप शुरू कर दिया है।"
    }
  } as const;

  return dictionary[locale][key];
}

function buildTicketCreatedMessage(locale: SupportLocale, ticketNumber: string) {
  return locale === "hi"
    ? `मैंने सपोर्ट टिकट ${ticketNumber} बना दिया है। हमारी टीम जल्द आपसे संपर्क करेगी।`
    : `I created support ticket ${ticketNumber}. A team member will follow up with you soon.`;
}

function buildEscalationMessage(locale: SupportLocale, ticketNumber: string) {
  return locale === "hi"
    ? `मैं इसे पूरी तरह अपने आप हल नहीं कर सका, इसलिए मैंने सपोर्ट टिकट ${ticketNumber} बना दिया है। हमारी टीम इसे देखेगी और आपसे संपर्क करेगी।`
    : `I could not fully resolve that automatically, so I created support ticket ${ticketNumber}. Our team will review it and follow up with you.`;
}

function buildPaymentMissingLinkMessage(locale: SupportLocale, invoiceNumber: string, ticketNumber: string) {
  return locale === "hi"
    ? `मुझे ${invoiceNumber} के लिए सक्रिय पेमेंट लिंक नहीं मिला, इसलिए मैंने सपोर्ट टिकट ${ticketNumber} बना दिया है। हमारी टीम जल्द मदद करेगी।`
    : `I could not find an active payment link for ${invoiceNumber}, so I created support ticket ${ticketNumber}. Our team will help you shortly.`;
}

function buildInvoiceStatusMessage(locale: SupportLocale, invoice: Record<string, unknown>, currency: string) {
  const paymentLine =
    typeof invoice.payment_link === "object" &&
    invoice.payment_link &&
    typeof (invoice.payment_link as Record<string, unknown>).short_url === "string"
      ? locale === "hi"
        ? ` पेमेंट लिंक: ${(invoice.payment_link as Record<string, unknown>).short_url as string}`
        : ` Payment link: ${(invoice.payment_link as Record<string, unknown>).short_url as string}`
      : "";

  return locale === "hi"
    ? `${asString(invoice.invoice_number)} की स्थिति ${localizeStatus(locale, asString(invoice.status))} है। देय तिथि: ${asString(invoice.due_date)}। बकाया राशि: ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)}।${paymentLine}`
    : `${asString(invoice.invoice_number)} is currently ${asString(invoice.status)}. Due date: ${asString(invoice.due_date)}. Balance due: ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)}.${paymentLine}`;
}

function buildLatestInvoiceMessage(locale: SupportLocale, invoice: Record<string, unknown>, currency: string) {
  return locale === "hi"
    ? `आपका नवीनतम इनवॉइस ${asString(invoice.invoice_number)} है। स्थिति: ${localizeStatus(locale, asString(invoice.status))}। देय तिथि: ${asString(invoice.due_date)}। बकाया राशि: ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)}।`
    : `Your latest invoice is ${asString(invoice.invoice_number)}. Status: ${asString(invoice.status)}. Due date: ${asString(invoice.due_date)}. Balance due: ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)}.`;
}

function buildInvoicePdfMessage(locale: SupportLocale, invoiceNumber: string, pdfUrl: string) {
  return locale === "hi"
    ? `आप ${invoiceNumber} की PDF यहां खोल सकते हैं: ${pdfUrl}`
    : `You can open the PDF for ${invoiceNumber} here: ${pdfUrl}`;
}

function buildPaymentLinkMessage(locale: SupportLocale, invoiceNumber: string, paymentUrl: string) {
  return locale === "hi"
    ? `आप ${invoiceNumber} का भुगतान यहां कर सकते हैं: ${paymentUrl}`
    : `You can pay ${invoiceNumber} here: ${paymentUrl}`;
}

function buildOutstandingMessage(locale: SupportLocale, count: number, summary: string, statementUrl: string) {
  return locale === "hi"
    ? `इस अकाउंट पर ${count} बकाया इनवॉइस हैं: ${summary}। पूरा स्टेटमेंट यहां डाउनलोड करें: ${statementUrl}`
    : `You currently have ${count} unpaid invoice(s): ${summary}. You can also download the full statement here: ${statementUrl}`;
}

function buildDocumentStatusMessage(locale: SupportLocale, label: string, number: string, status: string, amount: number, date: string, currency: string) {
  return locale === "hi"
    ? `${label} ${number} की स्थिति ${localizeStatus(locale, status)} है। दिनांक: ${date}। राशि: ${formatPortalMoney(amount, currency)}।`
    : `${label} ${number} is currently ${status}. Date: ${date}. Amount: ${formatPortalMoney(amount, currency)}.`;
}

function buildWhatsAppUrl(phone: string | null | undefined, text: string) {
  const recipient = normalizePhoneForWhatsApp(phone);
  if (!recipient) {
    return null;
  }

  return `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
}

function buildFollowUpCustomerNote(locale: SupportLocale, ticket: SupportTicketView | null) {
  if (!ticket) {
    return "";
  }

  const followUp = asRecord(ticket.follow_up);
  const email = asRecord(followUp?.email);
  if (email?.status === "sent") {
    return locale === "hi" ? " हमने ईमेल पुष्टि भी भेज दी है।" : " We also sent an email confirmation.";
  }

  return "";
}

function buildTicketNumber() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `SUP-${timestamp}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export function isSupportAssistantConfigured() {
  return getServerEnv().openaiApiKey.trim().length > 0;
}

async function getLatestConversation(portal: PortalLink) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("support_conversations")
    .select("id, org_id, portal_link_id, contact_id, title, status, last_message_at, created_at, updated_at")
    .eq("org_id", portal.org_id)
    .eq("portal_link_id", portal.id)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ConversationRow | null) ?? null;
}

export async function ensureSupportConversation(portal: PortalLink, initialTitle?: string) {
  const existing = await getLatestConversation(portal);
  if (existing && existing.status !== "closed") {
    return existing;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_conversations")
    .insert({
      org_id: portal.org_id,
      portal_link_id: portal.id,
      contact_id: portal.contact_id,
      title: initialTitle ?? null,
      status: "open"
    })
    .select("id, org_id, portal_link_id, contact_id, title, status, last_message_at, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Support conversation could not be created.");
  }

  return data as ConversationRow;
}

export async function listSupportMessages(conversationId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .select("id, role, body, created_at, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toMessageView(row as Record<string, unknown>));
}

export async function listSupportTicketsForPortal(portal: PortalLink) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .select("id, ticket_number, subject, priority, status, requested_by_name, requested_by_email, follow_up, created_at")
    .eq("org_id", portal.org_id)
    .eq("portal_link_id", portal.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toTicketView(row as Record<string, unknown>));
}

export async function getPortalSupportState(portal: PortalLink): Promise<PortalSupportState> {
  const conversation = await getLatestConversation(portal);
  const [messages, tickets] = await Promise.all([
    conversation ? listSupportMessages(conversation.id) : Promise.resolve([]),
    listSupportTicketsForPortal(portal)
  ]);

  return {
    configured: isSupportAssistantConfigured(),
    conversation,
    messages,
    tickets
  };
}

export async function addSupportMessage({
  portal,
  conversationId,
  role,
  body,
  metadata
}: {
  portal: PortalLink;
  conversationId: string;
  role: "user" | "assistant" | "system";
  body: string;
  metadata?: Json;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .insert({
      org_id: portal.org_id,
      conversation_id: conversationId,
      role,
      body,
      metadata: metadata ?? {}
    })
    .select("id, role, body, created_at, metadata")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Support message could not be saved.");
  }

  await admin
    .from("support_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      title: role === "user" ? body.slice(0, 120) : undefined
    })
    .eq("id", conversationId);

  return toMessageView(data as Record<string, unknown>);
}

async function dispatchSupportFollowUp({
  portal,
  ticketNumber,
  subject,
  summary
}: {
  portal: PortalLink;
  ticketNumber: string;
  subject: string;
  summary: string;
}): Promise<SupportFollowUp> {
  const admin = createSupabaseAdminClient();
  const [{ data: organization }, { data: contact }] = await Promise.all([
    admin
      .from("organizations")
      .select("name, preferred_language")
      .eq("id", portal.org_id)
      .maybeSingle(),
    portal.contact_id
      ? admin.from("contacts").select("display_name, email, phone").eq("org_id", portal.org_id).eq("id", portal.contact_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  const locale = toLocale(organization?.preferred_language);
  const customerName = asString(contact?.display_name || portal.display_name, locale === "hi" ? "ग्राहक" : "Customer");
  const customerEmail = asString(contact?.email || portal.email, "");
  const customerPhone = asString(contact?.phone, "");
  const portalUrl = createPortalUrl("customer", portal.access_token);

  const emailSubject = locale === "hi" ? `सपोर्ट टिकट ${ticketNumber} प्राप्त हुआ` : `Support ticket ${ticketNumber} received`;
  const emailHtml =
    locale === "hi"
      ? `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>सपोर्ट टिकट ${ticketNumber}</h2>
          <p>नमस्ते ${customerName},</p>
          <p>हमने आपका अनुरोध प्राप्त कर लिया है। विषय: <strong>${subject}</strong></p>
          <p>सारांश: ${summary}</p>
          <p>आप अपना पोर्टल यहां खोल सकते हैं: <a href="${portalUrl}">${portalUrl}</a></p>
          <p>हमारी टीम जल्द आपसे संपर्क करेगी।</p>
          <p>धन्यवाद,<br/>QuikFinance सपोर्ट</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Support ticket ${ticketNumber}</h2>
          <p>Hello ${customerName},</p>
          <p>We received your request. Subject: <strong>${subject}</strong></p>
          <p>Summary: ${summary}</p>
          <p>You can reopen your portal here: <a href="${portalUrl}">${portalUrl}</a></p>
          <p>Our team will follow up with you shortly.</p>
          <p>Thank you,<br/>QuikFinance Support</p>
        </div>
      `;
  const whatsappText =
    locale === "hi"
      ? `नमस्ते ${customerName}, आपका सपोर्ट टिकट ${ticketNumber} दर्ज हो गया है। विषय: ${subject}. पोर्टल: ${portalUrl}`
      : `Hello ${customerName}, your support ticket ${ticketNumber} has been logged. Subject: ${subject}. Portal: ${portalUrl}`;

  const followUp: SupportFollowUp = {
    locale,
    status: "skipped",
    channels: [],
    email: {
      status: "skipped",
      to: customerEmail || null,
      id: null,
      sent_at: null,
      reason: customerEmail ? null : "Customer email is not available."
    },
    whatsapp: {
      status: "skipped",
      to: null,
      url: null,
      reason: customerPhone ? null : "Customer phone is not available."
    }
  };

  const whatsappUrl = buildWhatsAppUrl(customerPhone, whatsappText);
  if (whatsappUrl) {
    followUp.whatsapp = {
      status: "ready",
      to: normalizePhoneForWhatsApp(customerPhone),
      url: whatsappUrl,
      reason: null
    };
    followUp.channels.push("whatsapp");
  }

  const { resendApiKey } = getServerEnv();
  if (resendApiKey && customerEmail) {
    try {
      const resend = new Resend(resendApiKey);
      const result = await resend.emails.send({
        from: "QuikFinance <billing@quikfinance.app>",
        to: [customerEmail],
        subject: emailSubject,
        html: emailHtml
      });

      followUp.email = {
        status: "sent",
        to: customerEmail,
        id: result.data?.id ?? null,
        sent_at: new Date().toISOString(),
        reason: null
      };
      followUp.channels.push("email");
    } catch (error) {
      followUp.email = {
        status: "failed",
        to: customerEmail,
        id: null,
        sent_at: null,
        reason: error instanceof Error ? error.message : "Email delivery failed."
      };
    }
  } else if (!resendApiKey) {
    followUp.email.reason = "RESEND_API_KEY is not configured.";
  }

  if (followUp.email.status === "sent") {
    followUp.status = followUp.whatsapp.status === "ready" ? "sent" : "sent";
  } else if (followUp.whatsapp.status === "ready") {
    followUp.status = followUp.email.status === "failed" ? "partial" : "ready";
  } else if (followUp.email.status === "failed") {
    followUp.status = "failed";
  }

  return followUp;
}

export async function createSupportTicket({
  portal,
  conversationId,
  subject,
  summary,
  priority
}: {
  portal: PortalLink;
  conversationId: string | null;
  subject: string;
  summary: string;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  const admin = createSupabaseAdminClient();
  const ticketNumber = buildTicketNumber();
  const { data, error } = await admin
    .from("support_tickets")
    .insert({
      org_id: portal.org_id,
      portal_link_id: portal.id,
      conversation_id: conversationId,
      contact_id: portal.contact_id,
      ticket_number: ticketNumber,
      subject,
      summary,
      priority: priority ?? "normal",
      status: "open",
      requested_by_name: portal.display_name,
      requested_by_email: portal.email,
      source: "portal_chat",
      follow_up: {}
    })
    .select("id, ticket_number, subject, priority, status, requested_by_name, requested_by_email, follow_up, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Support ticket could not be created.");
  }

  const followUp = await dispatchSupportFollowUp({
    portal,
    ticketNumber,
    subject,
    summary
  });
  const { data: updatedTicket } = await admin
    .from("support_tickets")
    .update({ follow_up: followUp })
    .eq("id", data.id)
    .select("id, ticket_number, subject, priority, status, requested_by_name, requested_by_email, follow_up, created_at")
    .single();

  if (conversationId) {
    await admin.from("support_conversations").update({ status: "escalated" }).eq("id", conversationId);
  }

  await admin.from("audit_logs").insert({
    org_id: portal.org_id,
    user_id: null,
    entity_type: "support_ticket",
    entity_id: asString(data.id),
    action: "create",
    new_values: {
      ticket_number: ticketNumber,
      subject,
      summary,
      priority: priority ?? "normal",
      portal_link_id: portal.id,
      follow_up: followUp
    }
  });

  return toTicketView((updatedTicket ?? data) as Record<string, unknown>);
}

function buildTranscript(messages: SupportMessageView[]) {
  return messages
    .slice(-HISTORY_LIMIT)
    .map((message) => `${message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "Customer"}: ${message.body}`)
    .join("\n");
}

function buildTools() {
  return [
    {
      type: "function",
      name: "get_customer_account_overview",
      description: "Get the customer's current account overview, including outstanding invoices and statement download details.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      },
      strict: true
    },
    {
      type: "function",
      name: "get_invoice_details",
      description: "Look up a specific invoice by invoice number, or return the latest open invoice when no invoice number is provided.",
      parameters: {
        type: "object",
        properties: {
          invoice_number: {
            type: ["string", "null"],
            description: "The invoice number mentioned by the customer, like INV-0004. Use null if the customer did not mention a specific invoice."
          }
        },
        required: ["invoice_number"],
        additionalProperties: false
      },
      strict: true
    },
    {
      type: "function",
      name: "get_customer_document_status",
      description: "Look up a sales order, quotation, or credit note for this customer. Use this when the customer asks about order, quote, refund, or credit note status.",
      parameters: {
        type: "object",
        properties: {
          document_type: {
            type: "string",
            enum: ["sales_order", "quotation", "credit_note"],
            description: "The type of customer document to inspect."
          },
          document_number: {
            type: ["string", "null"],
            description: "The document number mentioned by the customer. Use null if the customer did not mention a specific number."
          }
        },
        required: ["document_type", "document_number"],
        additionalProperties: false
      },
      strict: true
    },
    {
      type: "function",
      name: "create_support_ticket",
      description: "Create a human support escalation when the customer asks for a person or the issue cannot be fully solved from portal data.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "A short support ticket title."
          },
          summary: {
            type: "string",
            description: "A concise summary of the customer's problem."
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Ticket urgency."
          }
        },
        required: ["subject", "summary", "priority"],
        additionalProperties: false
      },
      strict: true
    }
  ];
}

async function createOpenAiResponse(input: unknown) {
  const { openaiApiKey, openaiSupportModel } = getServerEnv();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openaiSupportModel,
      instructions:
        "You are the QuikFinance customer support assistant inside a finance portal. Answer only about invoices, payments, statements, sales orders, quotations, credit notes, and portal help for the current customer. Use tools for exact account data. Respond in the customer's preferred language from the context when possible. Never invent balances, dates, invoice numbers, payment links, order numbers, or credit note details. If you cannot fully solve the issue, or the customer asks for a human, call create_support_ticket. Keep replies concise, practical, and friendly.",
      input,
      tools: buildTools()
    })
  });

  const payload = (await response.json()) as OpenAiResponse & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "OpenAI request failed.");
  }

  return payload;
}

function extractToolCalls(response: OpenAiResponse) {
  return (response.output ?? [])
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .filter((item) => item.type === "function_call")
    .map(
      (item) =>
        ({
          call_id: asString(item.call_id),
          name: asString(item.name),
          arguments: asString(item.arguments, "{}")
        }) satisfies ToolCall
    )
    .filter((item) => item.call_id && item.name);
}

function extractResponseText(response: OpenAiResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  for (const item of response.output ?? []) {
    const record = asRecord(item);
    if (!record || record.type !== "message" || !Array.isArray(record.content)) {
      continue;
    }

    for (const contentItem of record.content) {
      const content = asRecord(contentItem);
      if (content?.type === "output_text" && typeof content.text === "string" && content.text.trim().length > 0) {
        return content.text.trim();
      }
    }
  }

  return "";
}

export async function generateSupportReply({
  portal,
  conversationId,
  latestCustomerMessage
}: {
  portal: PortalLink;
  conversationId: string;
  latestCustomerMessage: string;
}) {
  const payload = await getCustomerPortalPayload(portal.access_token);
  if (!payload) {
    throw new Error("Customer portal context could not be loaded.");
  }

  const locale = toLocale(payload.organization?.preferred_language);
  const existingMessages = await listSupportMessages(conversationId);
  const transcript = buildTranscript(existingMessages);
  const statementUrl = `${getServerEnv().appUrl}/api/public/customer/${portal.access_token}/statement`;
  const intro = [
    `Organization: ${payload.organization?.name ?? "QuikFinance"}`,
    `Customer: ${payload.customer?.display_name ?? portal.display_name ?? "Customer"}`,
    `Preferred language: ${asString(payload.organization?.preferred_language, "en")}`,
    `Statement URL: ${statementUrl}`,
    `Open invoices: ${payload.invoices.filter((invoice) => Number(invoice.balance_due ?? 0) > 0).length}`,
    `Sales orders available: ${(payload.salesOrders ?? []).length}`,
    `Quotations available: ${(payload.quotations ?? []).length}`,
    `Credit notes available: ${(payload.creditNotes ?? []).length}`,
    transcript ? `Conversation so far:\n${transcript}` : "No prior conversation.",
    `Current customer message: ${latestCustomerMessage}`
  ].join("\n\n");

  let createdTicket: SupportTicketView | null = null;
  let workingInput: unknown[] = [
    {
      role: "user",
      content: [{ type: "input_text", text: intro }]
    }
  ];

  let response = await createOpenAiResponse(workingInput);

  for (let round = 0; round < 4; round += 1) {
    const toolCalls = extractToolCalls(response);
    if (toolCalls.length === 0) {
      break;
    }

    workingInput = [...workingInput, ...(response.output ?? [])];
    const toolOutputs: Array<Record<string, unknown>> = [];

    for (const toolCall of toolCalls) {
      const args = parseJson(toolCall.arguments);
      let output: Record<string, unknown>;

      if (toolCall.name === "get_customer_account_overview") {
        const outstandingInvoices = payload.invoices.filter((invoice) => Number(invoice.balance_due ?? 0) > 0);
        output = {
          organization_name: payload.organization?.name ?? "QuikFinance",
          customer_name: payload.customer?.display_name ?? portal.display_name ?? "Customer",
          currency: payload.organization?.base_currency ?? "INR",
          preferred_language: payload.organization?.preferred_language ?? "en",
          open_invoice_count: outstandingInvoices.length,
          outstanding_total: outstandingInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due ?? 0), 0),
          statement_url: statementUrl,
          sales_orders: (payload.salesOrders ?? []).slice(0, 10).map((order) => ({
            sales_order_number: order.sales_order_number,
            issue_date: order.issue_date,
            due_date: order.due_date,
            total: order.total,
            status: order.status
          })),
          quotations: (payload.quotations ?? []).slice(0, 10).map((quotation) => ({
            quotation_number: quotation.quotation_number,
            issue_date: quotation.issue_date,
            due_date: quotation.due_date,
            total: quotation.total,
            status: quotation.status
          })),
          credit_notes: (payload.creditNotes ?? []).slice(0, 10).map((creditNote) => ({
            credit_note_number: creditNote.credit_note_number,
            issue_date: creditNote.issue_date,
            due_date: creditNote.due_date,
            total: creditNote.total,
            status: creditNote.status
          })),
          invoices: outstandingInvoices.slice(0, 10).map((invoice) => ({
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            total: invoice.total,
            balance_due: invoice.balance_due,
            status: invoice.status,
            payment_url: invoice.payment_link?.short_url ?? null,
            pdf_url: `${getServerEnv().appUrl}/api/public/invoices/${invoice.id}/pdf?token=${portal.access_token}`
          }))
        };
      } else if (toolCall.name === "get_invoice_details") {
        const requestedInvoiceNumber = asString(args.invoice_number).trim().toLowerCase();
        const targetInvoice =
          payload.invoices.find((invoice) => invoice.invoice_number.toLowerCase() === requestedInvoiceNumber) ??
          payload.invoices.find((invoice) => Number(invoice.balance_due ?? 0) > 0) ??
          payload.invoices[0];

        output = targetInvoice
          ? {
              found: true,
              invoice_number: targetInvoice.invoice_number,
              issue_date: targetInvoice.issue_date,
              due_date: targetInvoice.due_date,
              total: targetInvoice.total,
              balance_due: targetInvoice.balance_due,
              status: targetInvoice.status,
              payment_url: targetInvoice.payment_link?.short_url ?? null,
              payment_status: targetInvoice.payment_link?.status ?? null,
              pdf_url: `${getServerEnv().appUrl}/api/public/invoices/${targetInvoice.id}/pdf?token=${portal.access_token}`
            }
          : {
              found: false,
              invoice_number: args.invoice_number ?? null
            };
      } else if (toolCall.name === "get_customer_document_status") {
        const requestedNumber = asString(args.document_number).trim().toLowerCase();
        const documentType = asString(args.document_type);

        if (documentType === "sales_order") {
          const targetOrder =
            (payload.salesOrders ?? []).find((order) => order.sales_order_number.toLowerCase() === requestedNumber) ??
            (payload.salesOrders ?? [])[0];
          output = targetOrder
            ? {
                found: true,
                document_type: "sales_order",
                document_number: targetOrder.sales_order_number,
                issue_date: targetOrder.issue_date,
                due_date: targetOrder.due_date,
                total: targetOrder.total,
                status: targetOrder.status
              }
            : { found: false, document_type: "sales_order", document_number: args.document_number ?? null };
        } else if (documentType === "quotation") {
          const targetQuotation =
            (payload.quotations ?? []).find((quotation) => quotation.quotation_number.toLowerCase() === requestedNumber) ??
            (payload.quotations ?? [])[0];
          output = targetQuotation
            ? {
                found: true,
                document_type: "quotation",
                document_number: targetQuotation.quotation_number,
                issue_date: targetQuotation.issue_date,
                due_date: targetQuotation.due_date,
                total: targetQuotation.total,
                status: targetQuotation.status
              }
            : { found: false, document_type: "quotation", document_number: args.document_number ?? null };
        } else {
          const targetCreditNote =
            (payload.creditNotes ?? []).find((creditNote) => creditNote.credit_note_number.toLowerCase() === requestedNumber) ??
            (payload.creditNotes ?? [])[0];
          output = targetCreditNote
            ? {
                found: true,
                document_type: "credit_note",
                document_number: targetCreditNote.credit_note_number,
                issue_date: targetCreditNote.issue_date,
                due_date: targetCreditNote.due_date,
                total: targetCreditNote.total,
                status: targetCreditNote.status,
                invoice_id: targetCreditNote.invoice_id
              }
            : { found: false, document_type: "credit_note", document_number: args.document_number ?? null };
        }
      } else if (toolCall.name === "create_support_ticket") {
        if (!createdTicket) {
          createdTicket = await createSupportTicket({
            portal,
            conversationId,
            subject: asString(args.subject, "Customer support request"),
            summary: asString(args.summary, latestCustomerMessage),
            priority: (asString(args.priority, "normal") as "low" | "normal" | "high" | "urgent")
          });
        }

        output = {
          ticket_created: true,
          ticket_number: createdTicket.ticket_number,
          status: createdTicket.status,
          follow_up: createdTicket.follow_up
        };
      } else {
        output = { error: `Unknown tool: ${toolCall.name}` };
      }

      toolOutputs.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(output)
      });
    }

    workingInput = [...workingInput, ...toolOutputs];
    response = await createOpenAiResponse(workingInput);
  }

  const assistantText =
    extractResponseText(response) ||
    (createdTicket
      ? `${buildTicketCreatedMessage(locale, createdTicket.ticket_number)}${buildFollowUpCustomerNote(locale, createdTicket)}`
      : locale === "hi"
        ? "??? ??? ???? ???? ??? ?? ???? ?? ???, ????? ??? ?????? ??? ?? ?????? ???? ????"
        : "I could not fully resolve that here yet, but I can help escalate it to support.");

  return {
    assistantText,
    ticket: createdTicket,
    responseId: response.id ?? null
  };
}

export async function generateFallbackSupportReply({
  portal,
  conversationId,
  latestCustomerMessage
}: {
  portal: PortalLink;
  conversationId: string;
  latestCustomerMessage: string;
}) {
  const payload = await getCustomerPortalPayload(portal.access_token);
  if (!payload) {
    throw new Error("Customer portal context could not be loaded.");
  }

  const locale = toLocale(payload.organization?.preferred_language);
  const currency = payload.organization?.base_currency ?? "INR";
  const normalized = latestCustomerMessage.toLowerCase();
  const statementUrl = `${getServerEnv().appUrl}/api/public/customer/${portal.access_token}/statement`;
  const numberMatch = latestCustomerMessage.match(/[A-Z]{1,5}-\d+/i);
  const matchedToken = numberMatch?.[0].toLowerCase() ?? null;
  const matchingInvoice =
    (matchedToken ? payload.invoices.find((invoice) => invoice.invoice_number.toLowerCase() === matchedToken) : null) ??
    payload.invoices.find((invoice) => Number(invoice.balance_due ?? 0) > 0) ??
    payload.invoices[0];
  const matchingSalesOrder =
    (matchedToken ? (payload.salesOrders ?? []).find((order) => order.sales_order_number.toLowerCase() === matchedToken) : null) ??
    (payload.salesOrders ?? [])[0];
  const matchingQuotation =
    (matchedToken ? (payload.quotations ?? []).find((quotation) => quotation.quotation_number.toLowerCase() === matchedToken) : null) ??
    (payload.quotations ?? [])[0];
  const matchingCreditNote =
    (matchedToken ? (payload.creditNotes ?? []).find((creditNote) => creditNote.credit_note_number.toLowerCase() === matchedToken) : null) ??
    (payload.creditNotes ?? [])[0];

  const wantsHumanSupport = containsAny(normalized, [
    "human",
    "agent",
    "call me",
    "support",
    "representative",
    "person",
    "\u0907\u0902\u0938\u093e\u0928",
    "\u090f\u091c\u0947\u0902\u091f",
    "\u0915\u0949\u0932",
    "\u0938\u092a\u094b\u0930\u094d\u091f",
    "\u092a\u094d\u0930\u0924\u093f\u0928\u093f\u0927\u093f"
  ]);
  const wantsCapabilities = containsAny(normalized, [
    "what can you do",
    "what can you help",
    "how can you help",
    "help",
    "hi",
    "hello",
    "hey",
    "\u0915\u094d\u092f\u093e \u0915\u0930 \u0938\u0915\u0924\u0947",
    "\u0915\u0948\u0938\u0947 \u092e\u0926\u0926",
    "\u092e\u0926\u0926",
    "\u0928\u092e\u0938\u094d\u0924\u0947"
  ]);
  const wantsLatestInvoice = containsAny(normalized, [
    "latest invoice",
    "last invoice",
    "recent invoice",
    "\u0932\u0947\u091f\u0947\u0938\u094d\u091f \u0907\u0928\u0935\u0949\u0907\u0938",
    "\u0928\u0935\u0940\u0928\u0924\u092e \u0907\u0928\u0935\u0949\u0907\u0938",
    "\u0906\u0916\u093f\u0930\u0940 \u0907\u0928\u0935\u0949\u0907\u0938"
  ]);
  const wantsStatement = containsAny(normalized, ["statement", "account statement", "\u0938\u094d\u091f\u0947\u091f\u092e\u0947\u0902\u091f", "\u0916\u093e\u0924\u093e \u0935\u093f\u0935\u0930\u0923"]);
  const wantsPdf = containsAny(normalized, ["pdf", "download invoice", "invoice copy", "\u092a\u0940\u0921\u0940\u090f\u092b", "\u0907\u0928\u0935\u0949\u0907\u0938 \u0915\u0949\u092a\u0940", "\u0915\u0949\u092a\u0940 \u092d\u0947\u091c"]);
  const wantsPayment = containsAny(normalized, ["pay", "payment", "paid", "\u092a\u0947\u092e\u0947\u0902\u091f", "\u092d\u0941\u0917\u0924\u093e\u0928", "\u092a\u0947 \u0915\u0930"]);
  const wantsPaymentIssue = wantsPayment && containsAny(normalized, ["failed", "declined", "error", "issue", "problem", "\u092b\u0947\u0932", "\u0938\u092e\u0938\u094d\u092f\u093e", "\u090f\u0930\u0930", "\u0928\u0939\u0940\u0902 \u0939\u0941\u0906"]);
  const wantsInvoiceStatus = containsAny(normalized, ["invoice", "due", "overdue", "status", "\u0907\u0928\u0935\u0949\u0907\u0938", "\u091a\u093e\u0932\u093e\u0928", "\u0926\u0947\u092f", "\u0913\u0935\u0930\u0921\u094d\u092f\u0942", "\u0938\u094d\u0925\u093f\u0924\u093f", "\u0938\u094d\u091f\u0947\u091f\u0938"]);
  const wantsOutstanding = containsAny(normalized, ["outstanding", "unpaid", "\u092c\u093e\u0915\u0940", "\u092c\u0915\u093e\u092f\u093e", "\u0905\u0928\u092a\u0947\u0921"]);
  const wantsOrder = containsAny(normalized, ["sales order", "order status", "order", "\u0911\u0930\u094d\u0921\u0930", "\u0906\u0930\u094d\u0921\u0930", "\u0938\u0947\u0932\u094d\u0938 \u0911\u0930\u094d\u0921\u0930"]);
  const wantsQuotation = containsAny(normalized, ["quotation", "quote", "\u0915\u094b\u091f\u0947\u0936\u0928", "\u0909\u0926\u094d\u0927\u0930\u0923"]);
  const wantsCredit = containsAny(normalized, ["credit note", "refund", "credit", "\u0930\u093f\u092b\u0902\u0921", "\u0915\u094d\u0930\u0947\u0921\u093f\u091f \u0928\u094b\u091f", "\u0930\u093e\u0936\u093f \u0935\u093e\u092a\u0938"]);
  const wantsAccountUpdate = containsAny(normalized, [
    "billing email",
    "update email",
    "change email",
    "gstin",
    "pan",
    "update phone",
    "email change",
    "\u0908\u092e\u0947\u0932 \u092c\u0926\u0932",
    "\u092b\u094b\u0928 \u092c\u0926\u0932",
    "\u091c\u0940\u090f\u0938\u091f\u0940"
  ]);
  const wantsAmountIssue = containsAny(normalized, [
    "wrong amount",
    "incorrect amount",
    "amount mismatch",
    "overcharged",
    "duplicate charge",
    "\u0917\u0932\u0924 \u0930\u093e\u0936\u093f",
    "\u0921\u0941\u092a\u094d\u0932\u093f\u0915\u0947\u091f",
    "\u091c\u094d\u092f\u093e\u0926\u093e \u091a\u093e\u0930\u094d\u091c",
    "\u0915\u092e \u091a\u093e\u0930\u094d\u091c"
  ]);

  if (wantsHumanSupport) {
    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: "Customer requested human support",
      summary: latestCustomerMessage,
      priority: "high"
    });

    return {
      assistantText: `${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsPaymentIssue) {
    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: matchingInvoice ? `Payment issue for ${matchingInvoice.invoice_number}` : "Payment issue reported by customer",
      summary: latestCustomerMessage,
      priority: "high"
    });

    return {
      assistantText: `${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsAmountIssue) {
    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: matchingInvoice ? `Billing dispute for ${matchingInvoice.invoice_number}` : "Customer reported a billing dispute",
      summary: latestCustomerMessage,
      priority: "high"
    });

    return {
      assistantText: `${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsAccountUpdate) {
    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: "Customer account update request",
      summary: latestCustomerMessage,
      priority: "normal"
    });

    return {
      assistantText: `${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsStatement) {
    return {
      assistantText: supportText(locale, "statement_link", { statementUrl }),
      ticket: null,
      responseId: null
    };
  }

  if (matchingInvoice && wantsPdf) {
    return {
      assistantText: buildInvoicePdfMessage(
        locale,
        matchingInvoice.invoice_number,
        `${getServerEnv().appUrl}/api/public/invoices/${matchingInvoice.id}/pdf?token=${portal.access_token}`
      ),
      ticket: null,
      responseId: null
    };
  }

  if (matchingInvoice && wantsLatestInvoice) {
    return {
      assistantText: buildLatestInvoiceMessage(locale, matchingInvoice as Record<string, unknown>, currency),
      ticket: null,
      responseId: null
    };
  }

  if (matchingInvoice && wantsPayment) {
    if (matchingInvoice.payment_link?.short_url) {
      return {
        assistantText: buildPaymentLinkMessage(locale, matchingInvoice.invoice_number, matchingInvoice.payment_link.short_url),
        ticket: null,
        responseId: null
      };
    }

    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: `Payment assistance for ${matchingInvoice.invoice_number}`,
      summary: latestCustomerMessage,
      priority: "normal"
    });

    return {
      assistantText: `${buildPaymentMissingLinkMessage(locale, matchingInvoice.invoice_number, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (matchingInvoice && wantsInvoiceStatus) {
    return {
      assistantText: buildInvoiceStatusMessage(locale, matchingInvoice as Record<string, unknown>, currency),
      ticket: null,
      responseId: null
    };
  }

  const openInvoices = payload.invoices.filter((invoice) => Number(invoice.balance_due ?? 0) > 0);
  if (wantsOutstanding) {
    if (openInvoices.length == 0) {
      return {
        assistantText: supportText(locale, "no_unpaid"),
        ticket: null,
        responseId: null
      };
    }

    const summary = openInvoices
      .slice(0, 3)
      .map((invoice) =>
        locale === "hi"
          ? `${invoice.invoice_number} (??? ${invoice.due_date}, ????? ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)})`
          : `${invoice.invoice_number} (due ${invoice.due_date}, balance ${formatPortalMoney(Number(invoice.balance_due ?? 0), currency)})`
      )
      .join("; ");
    return {
      assistantText: buildOutstandingMessage(locale, openInvoices.length, summary, statementUrl),
      ticket: null,
      responseId: null
    };
  }

  if (wantsOrder) {
    if (matchingSalesOrder) {
      return {
        assistantText: buildDocumentStatusMessage(
          locale,
          locale === "hi" ? "????? ?????" : "Sales order",
          matchingSalesOrder.sales_order_number,
          matchingSalesOrder.status,
          Number(matchingSalesOrder.total ?? 0),
          matchingSalesOrder.issue_date,
          currency
        ),
        ticket: null,
        responseId: null
      };
    }

    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: "Sales order status request",
      summary: latestCustomerMessage,
      priority: "normal"
    });

    return {
      assistantText: `${supportText(locale, "order_missing")} ${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsQuotation) {
    if (matchingQuotation) {
      return {
        assistantText: buildDocumentStatusMessage(
          locale,
          locale === "hi" ? "??????" : "Quotation",
          matchingQuotation.quotation_number,
          matchingQuotation.status,
          Number(matchingQuotation.total ?? 0),
          matchingQuotation.issue_date,
          currency
        ),
        ticket: null,
        responseId: null
      };
    }

    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: "Quotation status request",
      summary: latestCustomerMessage,
      priority: "normal"
    });

    return {
      assistantText: `${supportText(locale, "quotation_missing")} ${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsCredit) {
    if (matchingCreditNote) {
      return {
        assistantText: buildDocumentStatusMessage(
          locale,
          locale === "hi" ? "??????? ???" : "Credit note",
          matchingCreditNote.credit_note_number,
          matchingCreditNote.status,
          Number(matchingCreditNote.total ?? 0),
          matchingCreditNote.issue_date,
          currency
        ),
        ticket: null,
        responseId: null
      };
    }

    const ticket = await createSupportTicket({
      portal,
      conversationId,
      subject: "Refund or credit note request",
      summary: latestCustomerMessage,
      priority: "normal"
    });

    return {
      assistantText: `${supportText(locale, "credit_missing")} ${buildTicketCreatedMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
      ticket,
      responseId: null
    };
  }

  if (wantsCapabilities) {
    return {
      assistantText: supportText(locale, "capabilities"),
      ticket: null,
      responseId: null
    };
  }

  const ticket = await createSupportTicket({
    portal,
    conversationId,
    subject: "Customer support request",
    summary: latestCustomerMessage,
    priority: "normal"
  });

  return {
    assistantText: `${buildEscalationMessage(locale, ticket.ticket_number)}${buildFollowUpCustomerNote(locale, ticket)}`,
    ticket,
    responseId: null
  };
}

