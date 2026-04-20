import type { NextRequest } from "next/server";
import { Resend } from "resend";
import { requireApiContext } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/responses";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiContext();
  if (!auth.ok) {
    return fail(auth.status, { code: auth.code, message: auth.message });
  }

  const { resendApiKey } = getServerEnv();
  if (!resendApiKey) {
    return fail(500, { code: "EMAIL_NOT_CONFIGURED", message: "RESEND_API_KEY is required to send invoices." });
  }

  const resend = new Resend(resendApiKey);
  const result = await resend.emails.send({
    from: "QuikFinance <billing@quikfinance.app>",
    to: ["customer@example.com"],
    subject: `Invoice ${params.id}`,
    html: "<p>Your invoice is ready.</p>"
  });

  return ok({ id: params.id, email_id: result.data?.id ?? null });
}
